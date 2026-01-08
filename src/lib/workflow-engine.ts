import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import yaml from "yaml";
import { callLLM, getOrganizationApiKey, type LLMRole } from "./llm-client";
import prisma from "@/lib/prisma";
import { BillingType, ExecutionStatus } from "@/generated/prisma";

type ReviewerOutput = {
  halt: boolean;
  haltTriggerIds: string[];
  confidenceLevel?: number;
  confidenceData?: {
    label?: string;
    missing_elements?: Array<{ type: string; target: string; message: string }>;
    improvement_hint?: string;
    before_after?: { before: string; after: string };
  };
  issues: Array<{
    severity: "error" | "warning" | "info";
    message: string;
    recommendation?: string;
  }>;
  summary: string;
};

function parseReviewerOutput(content: string): ReviewerOutput | null {
  try {
    // JSON部分を抽出（```json ... ``` または直接JSON）
    const jsonMatch =
      content.match(/```json\s*([\s\S]*?)\s*```/) ||
      content.match(/(\{[\s\S]*"confidence_level"[\s\S]*\})/) ||
      content.match(/(\{[\s\S]*"halt"[\s\S]*\})/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[1]);
    const hasError = parsed.issues?.some((i: any) => i?.severity === "error");

    return {
      halt: hasError || parsed.halt === true || parsed.confidence_level === 1,
      haltTriggerIds: Array.isArray(parsed.haltTriggerIds) ? parsed.haltTriggerIds : [],
      confidenceLevel: typeof parsed.confidence_level === "number" ? parsed.confidence_level : undefined,
      confidenceData: {
        label: parsed.label,
        missing_elements: parsed.missing_elements,
        improvement_hint: parsed.improvement_hint,
        before_after: parsed.before_after,
      },
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
    };
  } catch {
    return null;
  }
}

const execAsync = promisify(exec);

export type StepResult = {
  order: number;
  role: string;
  status: "success" | "error" | "skipped";
  output: string | null;
  error?: string;
  durationMs: number;
};

export type WorkflowRunResult = {
  runId: string;
  workflowId: string;
  mode: string;
  status: "success" | "error";
  steps: StepResult[];
  artifacts: Record<string, string>;
  startedAt: string;
  completedAt: string;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  executionLogId?: string;
};

type WorkflowFile = {
  workflows: Array<{
    id: string;
    name: string;
    description?: string;
    modes?: Record<string, unknown>;
    steps: Array<{
      order: number;
      role: string;
      modelSlot?: string;
      input?: string;
      output?: string;
      notes?: string;
    }>;
  }>;
};

function resolveWorkflowsPath(): string {
  // 優先: リポジトリルートの workflows.yml
  const direct = path.resolve(process.cwd(), "workflows.yml");
  if (fs.existsSync(direct)) return direct;

  // 次: apps/platform から見た ../../workflows.yml
  const fromPlatform = path.resolve(process.cwd(), "..", "..", "workflows.yml");
  if (fs.existsSync(fromPlatform)) return fromPlatform;

  throw new Error("workflows.yml が見つかりませんでした。");
}

function loadWorkflows(): WorkflowFile {
  const raw = fs.readFileSync(resolveWorkflowsPath(), "utf-8");
  return yaml.parse(raw) as WorkflowFile;
}

function findWorkflow(workflowId: string) {
  const file = loadWorkflows();
  return file.workflows.find((w) => w.id === workflowId);
}

const PLATFORM_CWD = (() => {
  // apps/platform 直下を基準に runner コマンドを実行
  const candidate = path.resolve(process.cwd());
  if (fs.existsSync(path.join(candidate, "package.json"))) {
    return candidate;
  }
  // fallback: repo root/apps/platform
  return path.resolve(process.cwd(), "apps", "platform");
})();

async function executeRunner(command: string): Promise<{ output: string; success: boolean }> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: PLATFORM_CWD,
      env: process.env,
      maxBuffer: 10 * 1024 * 1024,
    });
    const combined = [stdout, stderr].filter(Boolean).join("\n").trim();
    return { output: combined || "(no output)", success: true };
  } catch (error: any) {
    const combined = [error.stdout, error.stderr].filter(Boolean).join("\n").trim();
    return { output: combined || String(error?.message ?? "runner failed"), success: false };
  }
}

export type RunWorkflowOptions = {
  dryRun?: boolean;
  organizationId?: string;
  userId?: string;
};

export async function runWorkflow(
  workflowId: string,
  mode: string,
  payload: Record<string, any>,
  options?: RunWorkflowOptions,
): Promise<WorkflowRunResult> {
  const workflow = findWorkflow(workflowId);
  if (!workflow) {
    throw new Error(`workflow not found: ${workflowId}`);
  }
  const modeKey = mode || "fast";
  if (workflow.modes && !workflow.modes[modeKey]) {
    throw new Error(`mode not found: ${modeKey}`);
  }

  const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = new Date();
  const stepsResult: StepResult[] = [];
  const artifacts: Record<string, string> = {};

  // トークン使用量の集計
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalTokens = 0;

  // 使用したAPIキー情報
  let usedApiKeyId: string | undefined;
  let billingType: BillingType = BillingType.platform_credit;
  // reviewer の halt 判定を保持
  let reviewerHalt: ReviewerOutput | null = null;

  const sortedSteps = [...workflow.steps].sort((a, b) => a.order - b.order);

  for (const step of sortedSteps) {
    const stepStart = Date.now();
    let status: StepResult["status"] = "skipped";
    let output: string | null = null;
    let error: string | undefined;

    if (step.role === "runner" && step.input) {
      const res = await executeRunner(step.input);
      status = res.success ? "success" : "error";
      output = res.output;
      if (!res.success) {
        error = res.output;
      }
    } else if (["drafter", "reviewer", "refiner"].includes(step.role)) {
      // LLMステップ実行
      let apiKey: string | undefined;
      let keyError: string | undefined;

      if (options?.organizationId) {
        // 組織ID指定あり → 組織キー必須（フォールバックしない）
        const orgKeyResult = await getOrganizationApiKey(options.organizationId, "openai");
        if (!orgKeyResult) {
          keyError = "Organization API key not found. Please register an API key for this organization.";
        } else {
          apiKey = orgKeyResult.key;
          usedApiKeyId = orgKeyResult.id;
          billingType = BillingType.byo_key;
        }
      } else {
        // 組織ID指定なし → 環境変数を使用
        if (!process.env.OPENAI_API_KEY) {
          keyError = "OPENAI_API_KEY is not configured. Please set the environment variable or select an organization with an API key.";
        } else {
          apiKey = process.env.OPENAI_API_KEY;
          billingType = BillingType.platform_credit;
        }
      }

      if (keyError) {
        status = "error";
        output = null;
        error = keyError;
      } else if (apiKey) {
        // 入力を構築: payload から取得 or 前ステップの artifacts から取得
        const inputKey = step.input || "";
        const inputParts = inputKey.split(" + ").map((k) => k.trim());
        const inputTexts: string[] = [];

        for (const part of inputParts) {
          if (payload[part]) {
            inputTexts.push(`## ${part}\n${payload[part]}`);
          } else if (artifacts[part]) {
            inputTexts.push(`## ${part}\n${artifacts[part]}`);
          }
        }

        if (inputTexts.length === 0) {
          // フォールバック: payload 全体を使用
          const payloadText = Object.entries(payload)
            .filter(([k]) => k !== "dryRun")
            .map(([k, v]) => `## ${k}\n${v}`)
            .join("\n\n");
          if (payloadText) {
            inputTexts.push(payloadText);
          }
        }

        const userPrompt = inputTexts.join("\n\n") || "(no input provided)";
        const llmResult = await callLLM(step.role as LLMRole, userPrompt, {
          modelSlot: step.modelSlot,
          apiKey,
        });

        if (llmResult.success) {
          status = "success";
          output = llmResult.content;
          if (step.role === "reviewer") {
            reviewerHalt = parseReviewerOutput(llmResult.content);
          }
          // トークン使用量を集計
          if (llmResult.usage) {
            totalPromptTokens += llmResult.usage.promptTokens;
            totalCompletionTokens += llmResult.usage.completionTokens;
            totalTokens += llmResult.usage.totalTokens;
            output += `\n\n---\n[tokens: ${llmResult.usage.totalTokens} (prompt: ${llmResult.usage.promptTokens}, completion: ${llmResult.usage.completionTokens})]`;
          }
        } else {
          status = "error";
          output = null;
          error = llmResult.error || "LLM call failed";
        }
      }
    } else {
      status = "skipped";
      output = null;
    }

    const durationMs = Date.now() - stepStart;
    stepsResult.push({
      order: step.order,
      role: step.role,
      status,
      output,
      error,
      durationMs,
    });

    if (step.output && output) {
      artifacts[step.output] = output;
    }
  }

  const anyError = stepsResult.some((s) => s.status === "error");
  const completedAt = new Date();
  const durationMs = completedAt.getTime() - startedAt.getTime();

  // 実行ログを保存（userId と organizationId が指定されている場合のみ）
  let executionLogId: string | undefined;
  if (options?.userId && options?.organizationId) {
    try {
      // 入力の要約（最大500文字）
      const inputSummary = JSON.stringify(payload).slice(0, 500);
      // 出力の要約（最後のステップの出力、最大500文字）
      const lastSuccessStep = stepsResult.filter(s => s.status === "success").pop();
      const outputSummary = lastSuccessStep?.output?.slice(0, 500) || null;
      // エラーメッセージ
      const errorStep = stepsResult.find(s => s.status === "error");
      const errorMessage = errorStep?.error || null;

      const log = await prisma.executionLog.create({
        data: {
          organizationId: options.organizationId,
          userId: options.userId,
          workflowId: workflow.id,
          billingType,
          apiKeyId: usedApiKeyId || null,
          inputSummary,
          outputSummary,
          confidenceLevel: reviewerHalt?.confidenceLevel ?? null,
          confidenceData: (reviewerHalt?.confidenceData as any) ?? null,
          halt: reviewerHalt?.halt ?? false,
          haltTriggerIds: reviewerHalt?.haltTriggerIds ?? [],
          tokenUsage: {
            promptTokens: totalPromptTokens,
            completionTokens: totalCompletionTokens,
            totalTokens,
          },
          durationMs,
          status: anyError ? ExecutionStatus.error : ExecutionStatus.success,
          errorMessage,
        },
      });
      executionLogId = log.id;
    } catch (logError) {
      console.error("[ExecutionLog] Failed to save execution log:", logError);
      // ログ保存失敗はワークフロー実行結果に影響させない
    }
  }

  return {
    runId,
    workflowId: workflow.id,
    mode: modeKey,
    status: anyError ? "error" : "success",
    steps: stepsResult,
    artifacts,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    tokenUsage: {
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
      totalTokens,
    },
    executionLogId,
  };
}


