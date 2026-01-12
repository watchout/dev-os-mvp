# 利用制限（Usage Limits）集計・判定ロジック設計

## 1. 概要
Free プランのユーザーが月間 10 回のワークフロー実行制限を超えないよう、API 実行直前に判定を行うガードレールを実装します。

## 2. 集計ロジック (Prisma / SQL)

### 集計対象
- テーブル: `execution_logs`
- 条件: 
    - `organization_id` が現在のコンテキストと一致
    - `created_at` が今月の 1 日 00:00:00 以降
    - `status` が `success` または `halted`（エラーによる失敗はカウントしない）

### クエリイメージ
```typescript
const startOfMonth = new Date();
startOfMonth.setDate(1);
startOfMonth.setHours(0, 0, 0, 0);

const count = await prisma.executionLog.count({
  where: {
    organizationId: currentOrgId,
    createdAt: {
      gte: startOfMonth,
    },
    status: {
      in: ['success', 'halted'],
    },
  },
});
```

---

## 3. ガードレール実装 (Hono Middleware)

### 処理フロー
1.  **プラン取得**: `organization.plan_id` を確認。
2.  **制限判定**:
    - `plan_id === 'free'` かつ `count >= 10` の場合:
        - `403 Forbidden` を返却。
        - JSON ボディに `docs/API_SPEC.md` で定義した `limit_reached` エラー形式をセット。
3.  **バイパス**: `pro`, `team`, `enterprise` プランの場合はカウントをスキップ（または記録のみ行う）。

---

## 4. パフォーマンス考慮
- 頻繁なカウントによる DB 負荷を避けるため、結果を Redis 等に 5 分程度キャッシュすることを推奨（将来拡張）。
- 現時点では `execution_logs` の `organization_id` と `created_at` にインデックスが貼られていることを確認済み。

