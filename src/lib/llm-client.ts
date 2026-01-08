/**
 * LLM Client for Workflow Engine
 * - OpenAI API呼び出しの共通モジュール
 * - モデルスロット（drafter, reviewer, refiner）の解決
 */

import OpenAI from "openai";
import prisma from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

// モデルスロット → 実際のモデル名のマッピング
const MODEL_SLOTS: Record<string, string> = {
  drafter: process.env.DRAFTER_MODEL || "gpt-4o",
  reviewer: process.env.REVIEWER_MODEL || "gpt-4o",
  refiner: process.env.REFINER_MODEL || "gpt-4o",
  light: process.env.LIGHT_MODEL || "gpt-4o-mini",
};

// ロール別のシステムプロンプト
const SYSTEM_PROMPTS: Record<string, string> = {
  drafter: `あなたは dev-OS の Drafter LLM です。
与えられたタスク定義と参照情報から、Implementation AI（Cursor等）向けの実装プロンプトを生成してください。

## 出力形式
- 明確なゴール定義
- 変更対象ファイル（2〜3ファイルに収める）
- 実装手順（ステップバイステップ）
- 禁止事項
- 期待される出力形式

日本語で回答してください。`,

  reviewer: `あなたは dev-OS の Reviewer LLM です。
Drafter が生成したプロンプトや計画をレビューし、halt_protocol のトリガーに該当するかチェックしてください。

## halt_protocol トリガー一覧
1. ssot-ambiguous (warning): SSOTが曖昧・確定不能
2. system-boundary-violation (error): システム境界違反のリスク
3. tenant-isolation-risk (error): テナント分離リスク
4. ssot-code-issue-mismatch (error): SSOT/実装/Issueの不整合
5. cause-not-found-over-time (warning): 原因未特定のまま時間経過

## チェック観点
1. ゴールが明確か
2. スコープが適切か（2〜3ファイルに収まるか）
3. 禁止事項が明記されているか
4. セキュリティ/認証/マルチテナントの考慮
5. 曖昧な表現がないか

## 出力形式（必ずこのJSON形式で回答）
{
  "halt": true または false,
  "haltTriggerIds": ["該当するトリガーID", ...] または [],
  "issues": [
    {
      "severity": "error" | "warning" | "info",
      "message": "指摘内容",
      "recommendation": "改善提案"
    }
  ],
  "summary": "総合評価（1-2文）"
}

severity が "error" のものが1つでもあれば halt: true としてください。
JSONのみを返してください。マークダウンのコードブロックは不要です。
日本語で回答してください。`,

  refiner: `あなたは dev-OS の Refiner LLM です。
Drafter の出力と Reviewer のフィードバックを受けて、最終版を生成してください。

## 指示
- Reviewer の指摘を反映
- 曖昧な表現を具体化
- 禁止事項を明確化
- 実装者が迷わない形に整形

日本語で回答してください。`,
};

export type LLMRole = "drafter" | "reviewer" | "refiner";

export type LLMCallResult = {
  success: boolean;
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
};

export async function callLLM(
  role: LLMRole,
  userPrompt: string,
  options?: {
    modelSlot?: string;
    apiKey?: string;
  }
): Promise<LLMCallResult> {
  const slot = options?.modelSlot || role;
  const model = MODEL_SLOTS[slot] || MODEL_SLOTS.drafter;
  const systemPrompt = SYSTEM_PROMPTS[role] || SYSTEM_PROMPTS.drafter;

  try {
    const apiKey = options?.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    // キーごとにクライアントを再生成（キャッシュしない）
    const client = new OpenAI({ apiKey });
    
    // 60秒タイムアウト
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    const response = await client.chat.completions.create(
      {
        model,
        temperature: role === "reviewer" ? 0 : 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      },
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);

    const content = response.choices[0]?.message?.content || "";
    const usage = response.usage;

    return {
      success: true,
      content,
      model,
      usage: usage
        ? {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
          }
        : undefined,
    };
  } catch (error: any) {
    let errorMessage = "LLM call failed";
    
    if (error?.name === "AbortError") {
      errorMessage = "LLM call timed out (60s)";
    } else if (error?.status === 401) {
      errorMessage = "Invalid API key";
    } else if (error?.status === 429) {
      errorMessage = "Rate limit exceeded";
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    console.error("[LLM Error]", errorMessage, error);
    
    return {
      success: false,
      content: "",
      model,
      error: errorMessage,
    };
  }
}

/**
 * LLM が利用可能かチェック
 */
export function isLLMAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export type OrganizationApiKeyResult = {
  id: string;
  key: string;
};

/**
 * 組織のデフォルトAPIキー（または最初のアクティブなキー）を取得して復号
 * @returns { id, key } または null
 */
export async function getOrganizationApiKey(
  organizationId: string,
  provider: "openai" | "anthropic" | "google" | "custom" = "openai",
): Promise<OrganizationApiKeyResult | null> {
  const apiKeyRecord = await prisma.apiKey.findFirst({
    where: {
      organizationId,
      provider,
      isActive: true,
    },
    orderBy: [
      { isDefault: "desc" },
      { createdAt: "desc" },
    ],
  });

  if (!apiKeyRecord) return null;

  try {
    const decryptedKey = decrypt(apiKeyRecord.encryptedKey);
    return {
      id: apiKeyRecord.id,
      key: decryptedKey,
    };
  } catch (error) {
    console.error("[getOrganizationApiKey] Decryption failed:", error);
    return null;
  }
}


