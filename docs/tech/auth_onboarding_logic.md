# Supabase Auth 連携 & オンボーディング実装ロジック

## 1. ユーザー同期フロー (Webhook)

Supabase の `auth.users` テーブルへの INSERT を検知し、アプリケーション側の `users` テーブルと同期します。

### ステップ
1.  **Supabase 側設定**: Database Webhook を作成し、`auth.users` の INSERT 時に `POST /api/v1/auth/webhook` を呼び出すよう設定。
2.  **署名検証**: Webhook エンドポイントで `x-supabase-signature` ヘッダーを検証（安全性の確保）。
3.  **データ作成**:
    ```typescript
    // ロジックイメージ
    await prisma.user.create({
      data: {
        id: payload.id, // Supabase UUID
        email: payload.email,
        name: payload.raw_user_meta_data.full_name || '新規ユーザー',
        authProviderId: payload.id,
      }
    });
    ```

---

## 2. 初期組織・ワークスペース自動生成 (Onboarding)

ユーザーが初回ログインした際、まだ組織に所属していない場合に実行します。

### ステップ
1.  **判定**: `/api/v1/me` 呼び出し時、`organizationMembers` が空であることを確認。
2.  **トランザクション実行**:
    ```typescript
    await prisma.$transaction(async (tx) => {
      // 1. 組織作成 (Personal)
      const org = await tx.organization.create({
        data: {
          name: `${user.name} の組織`,
          slug: generateUniqueSlug(user.name),
          planId: 'free',
        }
      });

      // 2. メンバーシップ作成 (Owner)
      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: 'owner',
          joinedAt: new Date(),
        }
      });

      // 3. 初期ワークスペース作成
      await tx.workspace.create({
        data: {
          organizationId: org.id,
          name: 'My First Workspace',
          slug: 'default',
        }
      });
    });
    ```

---

## 3. セキュリティ & ガバナンス

*   **RLS (Row Level Security)**: PostgreSQL 側で `organization_id` による RLS を有効化し、アプリケーション層のバグによるデータ漏洩を二重に防ぐ。
*   **Audit Log**: 組織作成・メンバー参加のイベントを `audit_log` テーブルへ記録する。

