"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { evaluateConfidenceLevel, type ConfidenceResult } from "@/lib/confidence-level-client";
import { ConfidenceMeter } from "@/components/ConfidenceMeter";

type WorkflowSummary = {
  id: string;
  name: string;
  description?: string;
  modes: string[];
  stepsCount: number;
};

type StepResult = {
  order: number;
  role: string;
  status: "success" | "error" | "skipped";
  output: string | null;
  error?: string;
  durationMs: number;
};

type WorkflowRunResult = {
  runId: string;
  workflowId: string;
  mode: string;
  status: "success" | "error";
  steps: StepResult[];
  artifacts: Record<string, string>;
  startedAt: string;
  completedAt: string;
  confidenceLevel?: number;
};

type Organization = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  workflow: WorkflowSummary;
};

// LLMステップを含むワークフローかどうか判定
const LLM_WORKFLOWS = ["generate_prompts", "create_ssot", "impl_feature", "bugfix_flow", "select_next_task", "web_review_prompt_or_ssot"];

export function WorkflowRunModal({ workflow }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(() => workflow.modes[0] || "fast");
  const [dryRun, setDryRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ReactNode | null>(null);
  const [result, setResult] = useState<WorkflowRunResult | null>(null);
  
  // LLMワークフロー用の入力
  const [taskDefinition, setTaskDefinition] = useState("");
  const [ssotSnippets, setSsotSnippets] = useState("");
  
  // 組織選択
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [orgsLoading, setOrgsLoading] = useState(false);
  // 確信レベル（事前評価）
  const [confidence, setConfidence] = useState<ConfidenceResult | null>(null);
  const [confidenceLoading, setConfidenceLoading] = useState(false);
  
  const isLLMWorkflow = LLM_WORKFLOWS.includes(workflow.id);

  // 組織一覧を取得
  const fetchOrganizations = useCallback(async () => {
    setOrgsLoading(true);
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const orgs = data?.data?.memberships?.map((m: { organization: Organization }) => m.organization) || [];
        setOrganizations(orgs);
        // 最初の組織をデフォルト選択
        if (orgs.length > 0 && !selectedOrgId) {
          setSelectedOrgId(orgs[0].id);
        }
      }
    } catch {
      // エラーは無視
    } finally {
      setOrgsLoading(false);
    }
  }, [selectedOrgId]);

  // モーダルが開いたときに組織を取得
  useEffect(() => {
    if (open && organizations.length === 0) {
      fetchOrganizations();
    }
  }, [open, organizations.length, fetchOrganizations]);

  useEffect(() => {
    if (workflow.modes.length > 0) {
      setMode(workflow.modes[0]);
    }
  }, [workflow.modes]);

  // 事前の確信レベル評価（LLMワークフローのみ）
  useEffect(() => {
    const evaluate = async () => {
      if (!isLLMWorkflow) {
        setConfidence(null);
        return;
      }
      if (!taskDefinition.trim()) {
        setConfidence(null);
        return;
      }
      setConfidenceLoading(true);
      try {
        const result = await evaluateConfidenceLevel(taskDefinition.trim(), {
          ssot: ssotSnippets.trim() || undefined,
        });
        setConfidence(result);
      } catch {
        setConfidence(null);
      } finally {
        setConfidenceLoading(false);
      }
    };
    evaluate();
  }, [taskDefinition, ssotSnippets, isLLMWorkflow]);

  const run = async () => {
    setError(null);
    setResult(null);
    setLoading(true);
    
    // LLMワークフローの場合は入力を含める
    const payload: Record<string, string> = {};
    if (isLLMWorkflow) {
      if (taskDefinition.trim()) {
        payload.task_definition = taskDefinition.trim();
      }
      if (ssotSnippets.trim()) {
        payload.ssot_snippets = ssotSnippets.trim();
      }
      // 汎用的な入力キー
      if (taskDefinition.trim()) {
        payload.requirements = taskDefinition.trim();
        payload.target_text = taskDefinition.trim();
      }
    }
    
    try {
      const res = await fetch("/api/workflows/run", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: workflow.id,
          mode,
          payload,
          dryRun,
          organizationId: selectedOrgId || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json.error?.code === "limit_reached") {
          setError(
            <div className="rounded-md bg-amber-50 p-3 text-amber-800 border border-amber-200">
              <p className="font-semibold">【弥栄の循環：利用制限のお知らせ】</p>
              <p className="mt-1">知恵の蓄積（実行回数）が月間制限に達しました。</p>
              <p className="mt-2 text-xs">
                現場の「不」をさらに「光」へと変え、開発に「確信」を持ち続けるために、
                Proプランへのアップグレードをご検討ください。
              </p>
              <div className="mt-3">
                <a
                  href="/billing"
                  className="inline-flex items-center rounded-md bg-amber-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-amber-500"
                >
                  プランを確認する
                </a>
              </div>
            </div>
          );
        } else {
          setError(json.error?.message || json.error || "実行に失敗しました。");
        }
        return;
      }
      const data = await res.json();
      setResult(data?.data ?? null);
    } catch (e) {
      setError("ネットワークエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        実行
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6">
          <div className="w-full max-w-3xl rounded-lg border bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-500">Workflow</p>
                <h3 className="text-lg font-semibold text-zinc-900">{workflow.name}</h3>
                {workflow.description && (
                  <p className="text-sm text-zinc-600">{workflow.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setResult(null);
                  setError(null);
                }}
                className="text-sm text-zinc-500 hover:text-zinc-700"
              >
                閉じる
              </button>
            </div>

            {/* LLMワークフロー用入力フィールド */}
            {isLLMWorkflow && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700">
                    タスク定義 / 入力テキスト
                    <span className="ml-1 text-xs text-zinc-500">(必須)</span>
                  </label>
                  <textarea
                    value={taskDefinition}
                    onChange={(e) => setTaskDefinition(e.target.value)}
                    placeholder="例: ユーザー登録機能を実装する。メールアドレスとパスワードでの登録、バリデーション、重複チェックを含める。"
                    rows={4}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700">
                    SSOT / 参照情報
                    <span className="ml-1 text-xs text-zinc-500">(任意)</span>
                  </label>
                  <textarea
                    value={ssotSnippets}
                    onChange={(e) => setSsotSnippets(e.target.value)}
                    placeholder="例: 関連するSSOTの抜粋、既存コードの情報、制約条件など"
                    rows={3}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm text-zinc-900 shadow-sm placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr,1fr]">
              <div className="space-y-3">
                {/* 組織選択（LLMワークフローの場合） */}
                {isLLMWorkflow && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700">
                      組織
                      <span className="ml-1 text-xs text-zinc-500">(APIキー使用)</span>
                    </label>
                    <select
                      value={selectedOrgId}
                      onChange={(e) => setSelectedOrgId(e.target.value)}
                      disabled={orgsLoading}
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-zinc-100"
                    >
                      <option value="">環境変数を使用</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name} ({org.slug})
                        </option>
                      ))}
                    </select>
                    {selectedOrgId && (
                      <p className="mt-1 text-xs text-amber-600">
                        🔑 組織のAPIキーを使用（未登録の場合はエラー）
                      </p>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-zinc-700">モード</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {workflow.modes.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  dry run
                </label>
                <button
                  type="button"
                  onClick={run}
                  disabled={
                    loading ||
                    (isLLMWorkflow && !taskDefinition.trim()) ||
                    (isLLMWorkflow && confidence?.action === "halt")
                  }
                  className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-300"
                >
                  {loading ? "実行中..." : "実行する"}
                </button>
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>

              <div className="rounded-lg border bg-zinc-50 p-4 text-sm text-zinc-700">
                <p>ステップ数: {workflow.stepsCount}</p>
                <p>モード数: {workflow.modes.length}</p>
                {isLLMWorkflow && (
                  <div className="mt-2 space-y-2 text-xs text-amber-600">
                    <p>⚡ このワークフローはLLMを使用します</p>
                    <ConfidenceMeter result={confidence} loading={confidenceLoading} />
                  </div>
                )}
              </div>
            </div>

            {result && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-semibold text-zinc-900">実行結果</h4>
                  <span
                    className={`text-sm font-semibold ${
                      result.status === "success" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {result.status === "success" ? "成功" : "失敗"}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  {result.startedAt} → {result.completedAt}
                </p>
                <ul className="mt-4 space-y-3">
                  {result.steps.map((step) => (
                    <li key={step.order} className="rounded-lg border bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-zinc-900">
                            Step {step.order} - {step.role}
                          </span>
                          <span
                            className={`text-xs font-semibold ${
                              step.status === "success"
                                ? "text-green-600"
                                : step.status === "error"
                                ? "text-red-600"
                                : "text-zinc-500"
                            }`}
                          >
                            {step.status === "success"
                              ? "✅ success"
                              : step.status === "error"
                              ? "❌ error"
                              : "⏭️ skipped"}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-500">{step.durationMs} ms</span>
                      </div>
                      {step.output && (
                        <pre className="mt-2 whitespace-pre-wrap rounded bg-zinc-100 p-2 text-xs text-zinc-800">
                          {step.output}
                        </pre>
                      )}
                      {step.error && (
                        <p className="mt-1 text-xs text-red-600">Error: {step.error}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


