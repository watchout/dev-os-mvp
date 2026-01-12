あなたはこのリポジトリ専属の「設計・管理AI」です。

## このプロジェクトについて

- プロジェクト名（仮）：dev-os-mvp
- 目的：
  - 「破綻しない AI 開発OS」の自分用MVPをまずローカルで動かすこと
  - 仕様・SSOT・ワークフローをこのリポジトリで一元管理し、
    実際のアプリ開発（OmotenasuAI など）は別リポジトリ＋Cursor で行う前提
- このリポジトリの「仕様の正本」は `DEV_OS_SPEC.md` です。
  まずこのファイルを必ず読み込み、そこに書かれた方針に沿って設計・実装を進めてください。

## まずやりたいこと（MVP v0.1のスコープ）

`DEV_OS_SPEC.md` に書かれている内容を前提として、まずは以下を実現してください：

1. リポジトリ構成の初期化（最小構成）
   - 例として、以下のような構成を想定していますが、必要に応じて微調整して提案してください。

     dev-os-mvp/
       ├─ ssot/
       │   ├─ project.yml        # プロジェクト概要・VMV・用語
       │   └─ features.yml       # 機能SSOT（最初は1〜2機能でOK）
       ├─ workflows.yml          # ワークフロー定義
       ├─ workspace_llm_config.json
       ├─ src/
       │   └─ core/ ...          # ワークフロー実行ロジックなど（必要に応じて）
       ├─ scripts/
       │   └─ run_workflow.ts    # CLI実行エントリーポイント
       ├─ outputs/
       │   ├─ AI_GUIDE.md        # 自動生成（将来OmotenasuAI側にコピーして使う）
       │   └─ .cursorrules       # 自動生成
       ├─ package.json
       ├─ tsconfig.json
       └─ README.md

2. 技術スタックの前提
   - Node.js + TypeScript ベースのCLIツールとして実装してください。
   - ランナーは `ts-node` でも `tsx` でも構いませんが、一般的でメンテしやすい構成を提案・採用してください。
   - 依存パッケージ（例：dotenv, zod, yaml パーサー など）が必要であれば、理由とともに提案し、`package.json` に反映してください。

3. `workflows.yml` の初期定義
   - `DEV_OS_SPEC.md` に記載されている以下のワークフローのうち、MVP v0.1 で必要なものだけをまず定義してください：
     - `create_ssot`（SSOT新規作成）
     - `generate_prompts`（タスクからCursor用プロンプト生成）
   - Fast / Balanced / Strict のモード違いをどう扱うかも、最小限の形でよいので定義してください。

4. `workspace_llm_config.json` の初期定義
   - 「Drafter / Reviewer / Light」というスロット構造をベースに、サンプルのモデル設定だけを入れた状態で定義してください。
   - ここでは“実際にどのモデルを使うか”よりも「構造」が重要なので、あとから差し替えやすいように設計してください。

5. `scripts/run_workflow.ts` のスケルトン
   - コマンドラインから以下のように実行できる前提で、最低限のスケルトンを作ってください。

     - `npm run dev create_ssot -- --mode balanced`
     - `npm run dev generate_prompts -- --task-id booking-api-001`

   - まだ LLM API 連携までは実装しなくて構いません。
     まずは「CLI引数 → workflows.yml を読み込む → 選択されたワークフロー名とモードを解決し、実行プラン（ダミー）をログに出す」ところまででOKです。
   - 後で LLM 呼び出しロジックを差し込めるよう、設計的な分割（インタフェースや core モジュールなど）だけ意識してください。

6. README の初期化
   - README.md に、このリポジトリの「役割」と「DEV_OS_SPEC.md へのリンク」を簡潔に書いてください。
   - 詳細仕様は DEV_OS_SPEC.md を参照させる構成にします。

## 進め方のルール

- まず `DEV_OS_SPEC.md` を読み、MVP v0.1 のスコープをあなたなりに短く要約してください。
- そのうえで、
  1. ファイル構成案
  2. 使用する主要ライブラリ
  3. 最初に作成するファイルと中身
  を提案し、必要に応じて私に確認を取りながら進めてください。
- いきなり全ファイルを一気に書き換えるのではなく、
  - 「まず package.json と tsconfig.json」
  - 「次に workflows.yml と workspace_llm_config.json」
  - 「最後に scripts/run_workflow.ts」
  のように、ステップを分けて差分を示しながら進めてください。

まずは `DEV_OS_SPEC.md` を読んだうえで、
「このリポジトリのMVP v0.1でやることの要約」と
「最初に作るべきファイルと、その理由」
を箇条書きで出してください。