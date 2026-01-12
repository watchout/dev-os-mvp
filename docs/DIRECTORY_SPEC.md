# IYASAKA dev-OS | Directory Structure Specification

## 1. モノレポ構造 (Monorepo)
本プロジェクトは、フロントエンド、バックエンド、および共通ロジックを効率的に管理するため、モノレポ構造を採用します。

```text
/
├── apps/               # アプリケーション層
│   ├── web-console/    # Next.js (App Router): メイン管理画面
│   ├── lp/             # 静的 HTML/CSS: ランディングページ
│   └── docs-site/      # (将来) ドキュメント・ポータル
├── packages/           # 共有パッケージ
│   ├── core/           # SSOT 処理、ワークフローエンジン中核
│   ├── schema/         # Prisma スキーマ、Zod 定義、共通型
│   └── ui-kit/         # IYASAKA 共通 UI コンポーネント (React)
├── scripts/            # 開発・運用支援スクリプト
├── ssot/               # dev-OS 自体の設計正本 (YAML)
├── docs/               # プロジェクト仕様書・ガイドライン
└── workflows.yml       # dev-OS の動作定義
```

## 2. 重要なディレクトリとファイル

### 2.1 `apps/web-console`
*   `src/app/`: Next.js App Router ページコンポーネント。
*   `src/components/`: 画面固有のコンポーネント。
*   `src/hooks/`: カスタムフック（データ取得、状態管理）。
*   `src/services/`: 外部サービス（Supabase, Stripe）連携。

### 2.2 `packages/core`
*   `prompt-builder/`: SSOT からプロンプトを組み立てるロジック。
*   `orchestrator/`: 多段 LLM の実行制御。
*   `governance/`: Halt プロトコルの判定エンジン。

### 2.3 `ssot/`
*   `project.yml`: プロジェクト全体の定義。
*   `features.yml`: 機能一覧。
*   `platform.yml`: プラットフォーム基盤（SaaS）の定義。
*   `governance.yml`: ガバナンスルールと Halt 条件。

---

## 3. 開発の流れと配置ルール

1.  **仕様変更:** まず `ssot/` 内の YAML を更新する。
2.  **型同期:** `packages/schema` で Prisma 修正や型定義の更新を行う。
3.  **ロジック実装:** `packages/core` でエンジンの変更が必要な場合は修正。
4.  **画面反映:** `apps/web-console` で UI を更新する。



