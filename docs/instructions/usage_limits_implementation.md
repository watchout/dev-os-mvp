# 実装指示書：利用制限（Usage Limits）エンジンの実装

## 1. 目的
Free プランのユーザーに対し、月間 10 回のワークフロー実行制限を課し、制限到達時に適切にブロックする機能を実装する。これは PLG モデルにおける「Pro プランへの転換」を促す重要なガードレールである。

## 2. 対象ファイル
- `apps/platform/src/lib/usage-limits.ts` (新規作成)
- `apps/platform/src/app/api/workflows/run/route.ts` (修正)
- `apps/platform/src/components/WorkflowRunModal.tsx` (修正)

## 3. 実装詳細

### 3.1 判定ロジックの実装 (`lib/usage-limits.ts`)
以下の関数を実装してください：

```typescript
/**
 * 組織の今月のワークフロー実行数を取得し、制限に達しているか判定する
 */
export async function checkUsageLimit(organizationId: string): Promise<{
  isLimited: boolean;
  currentCount: number;
  limit: number;
}> {
  // 1. 組織のプランを取得
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { planId: true }
  });

  if (!org || org.planId !== 'free') {
    return { isLimited: false, currentCount: 0, limit: Infinity };
  }

  // 2. 今月の実行数をカウント（success または halted）
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await prisma.executionLog.count({
    where: {
      organizationId,
      createdAt: { gte: startOfMonth },
      status: { in: ['success', 'halted'] },
    },
  });

  const LIMIT = 10; // Free プランの制限数
  return {
    isLimited: count >= LIMIT,
    currentCount: count,
    limit: LIMIT
  };
}
```

### 3.2 API エンドポイントへの統合 (`api/workflows/run/route.ts`)
ワークフロー実行前に `checkUsageLimit` を呼び出し、制限を超えている場合は `403 Forbidden` を返却してください。

```typescript
// 実装イメージ
const usage = await checkUsageLimit(organizationId);
if (usage.isLimited) {
  return NextResponse.json(
    {
      error: {
        code: "limit_reached",
        message: "月間実行制限（10回）に達しました。Proプランへのアップグレードをご検討ください。",
        details: usage
      }
    },
    { status: 403 }
  );
}
```

### 3.3 UI でのフィードバック (`WorkflowRunModal.tsx`)
403 エラー（`limit_reached`）を受け取った際、単なるエラー表示ではなく、アップグレードを促すメッセージと Stripe ポータル（将来）へのリンクを表示するよう調整してください。

## 4. 期待される動作
1.  Free プランの組織で、今月の実行数が 10 回に達する。
2.  11 回目の実行を試みると、API が 403 を返し、実行がブロックされる。
3.  UI に「制限に達しました」という旨のメッセージが表示される。

## 5. ガバナンス・ナラティブ確認
- メッセージに IYASAKA の「体温」を含めること（例：「知恵の蓄積が制限に達しました。さらなる弥栄のために...」）。
- SSOT (`pricing.yml`) の制限値と整合していること。

