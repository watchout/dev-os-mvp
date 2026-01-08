# dev-OS Platform

dev-OS の本番用 Web コンソール。

## 技術スタック

- **Frontend**: Next.js 15 (App Router) + Tailwind CSS
- **Auth**: Supabase Auth
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma

## セットアップ

### 1. 環境変数の設定

```bash
# テンプレートをコピー
cp env.template .env.local
cp env.template .env
```

Supabase ダッシュボードから以下の値を取得して設定：

| 変数 | 取得場所 |
|------|----------|
| `DATABASE_URL` | Settings > Database > Connection string (Transaction) |
| `DIRECT_URL` | Settings > Database > Connection string (Session) |
| `NEXT_PUBLIC_SUPABASE_URL` | Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings > API > anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings > API > service_role |

### 2. 依存関係のインストール

```bash
npm install
```

### 3. データベースマイグレーション

```bash
# Prisma クライアント生成
npx prisma generate

# マイグレーション実行（初回）
npx prisma migrate dev --name init
```

### 4. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアクセス。

## ディレクトリ構成

```
apps/platform/
├── prisma/
│   └── schema.prisma    # DB スキーマ（ssot/platform.yml から生成）
├── src/
│   ├── app/             # Next.js App Router
│   ├── components/      # UI コンポーネント
│   ├── lib/             # ユーティリティ
│   │   ├── prisma.ts    # Prisma クライアント
│   │   └── supabase/    # Supabase クライアント
│   └── generated/
│       └── prisma/      # Prisma 生成コード
├── env.template         # 環境変数テンプレート
└── package.json
```

## SSOT との関係

このプロジェクトのデータモデルは `ssot/platform.yml` を正本としています。
スキーマ変更は SSOT を先に更新し、その後 Prisma スキーマに反映してください。

## 開発ルール

- 認証は Supabase Auth に委任
- API キーは AES-256-GCM で暗号化して保存
- 監査ログは重要な操作で必ず記録
