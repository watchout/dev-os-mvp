# dev-os-mvp Platform

AIを使ったSaaS/アプリ開発のための「破綻しない開発OS」MVPプラットフォーム。

## これは何をするものか

- spec-first / SSOT / 複数LLMチェックを前提にした開発フローを提供
- 実装そのもの（コード生成）は Cursor 等のIDEが担当
- このリポジトリは「仕様・SSOT・ワークフロー」を一元管理する

## Getting Started

```bash
# 依存関係のインストール
npm install

# Prisma クライアント生成
npx prisma generate

# 開発サーバー起動
npm run dev
```

Open [http://localhost:5100](http://localhost:5100) with your browser.

## Available Scripts

- `npm run dev` - 開発サーバー起動
- `npm run build` - 本番ビルド
- `npm run typecheck` - TypeScript 型チェック
- `npm run lint` - ESLint 実行
- `npm run test` - Vitest テスト実行

## 詳細仕様

👉 [docs/DEV_OS_SPEC.md](../../docs/DEV_OS_SPEC.md)
