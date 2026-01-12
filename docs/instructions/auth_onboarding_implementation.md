# 実装指示書：Supabase Auth 連携 & 初期オンボーディング

## 1. 目的
ユーザーが Supabase Auth でサインアップした際、自動的にアプリケーション側のユーザーレコードを作成し、初回ログイン時にデフォルトの組織とワークスペースをセットアップする。これにより、ユーザーは登録後すぐに「Discovery Session」を開始できる。

## 2. 対象ファイル
- `apps/platform/src/app/api/auth/webhook/route.ts` (新規作成)
- `apps/platform/src/app/api/auth/onboard/route.ts` (新規作成)
- `apps/platform/src/lib/auth.ts` (修正/確認)

## 3. 実装詳細

### 3.1 ユーザー同期 Webhook (`api/auth/webhook/route.ts`)
Supabase Auth の `auth.users` テーブルへの INSERT を検知する Webhook を実装してください。
- `x-supabase-signature` ヘッダーによる署名検証（任意だが推奨）。
- `auth.users` の UUID を `user.id` として使用し、`email` と `name` を同期。

### 3.2 トランザクション・オンボーディング (`api/auth/onboard/route.ts`)
ユーザーが初回アクセス時に「まだ組織を持っていない」場合に呼び出されるエンドポイント。
Prisma トランザクションを使用して、以下を一括作成してください：
1.  **Organization**: 名前は「[ユーザー名] の組織」、`planId` は `free`。
2.  **OrganizationMember**: 作成した組織の `owner` としてユーザーを紐付け。
3.  **Workspace**: 名前は「最初のプロジェクト」、スラグは `default`。

### 3.3 初期スラグ生成ロジック
スラグ（組織/ワークスペース）は URL に使用されるため、重複しないユニークなものを生成するユーティリティ関数（例：`generateUniqueSlug`）を用意してください。

## 4. 期待される動作
1.  ユーザーが LP から「今すぐ無料で始める」をクリック。
2.  Supabase Auth のサインアップ画面で登録。
3.  Webhook によりアプリケーション側にユーザーが作成される。
4.  初回ログイン直後、`/api/auth/onboard` が走り、自動的に組織・ワークスペースが整う。
5.  ユーザーは即座にコクピット画面（Discovery Session への入口）へ遷移する。

## 5. ガバナンス・ナラティブ確認
- 組織作成時のデフォルト名は、IYASAKA のブランドを感じさせる温かい名称（例：「弥栄の足場」など）をオプションで検討。
- 監査ログ (`AuditLog`) に「組織作成」イベントを記録すること。

