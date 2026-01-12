## dev-os-mvp の他プロジェクトへの導入ガイド（npm scripts / CI テンプレ）

このドキュメントは、既存の Node/TypeScript ベースのSaaS開発フロー（GitHub + CI）に  
`dev-os-mvp` を「開発OS」として組み込む際のテンプレート集です。

ここに書かれている内容は **サンプル** であり、実際のプロジェクト構成に合わせてパスやコマンドを調整してください。

---

## 1. アプリケーション側の npm scripts テンプレ

想定シナリオ：

- アプリケーションリポジトリの中に、`dev-os-mvp`（dev-OS）がサブディレクトリや Git submodule として配置されている。
- アプリ側では、`dev-OS` が定義した SSOT / ワークフローに乗りつつ、  
  これまで通り `typecheck` / `test` などの既存フローも維持したい。

### 1-1. 最小テンプレ例

アプリ側の `package.json` に、次のような scripts を追加することを想定します：

```jsonc
{
  "scripts": {
    // dev-OS のワークフロープランを確認する（例: create_ssot を balanced モードでドライラン）
    "devos:plan": "ts-node dev-os/scripts/run_workflow.ts create_ssot --mode balanced",

    // 開発チェック（型チェック＋テスト）をまとめて実行する
    "devos:check": "npm run typecheck && npm test",

    // 既存 or 新規の型チェックコマンド
    "typecheck": "tsc --noEmit"
  }
}
```

#### メモ

- `devos:plan`
  - `dev-os-mvp` をアプリリポジトリ内のどこに配置するかによって、パスは変わります。
  - 例：
    - `dev-os/` や `tools/dev-os/` などに置く場合は、パスを `ts-node tools/dev-os/scripts/run_workflow.ts ...` のように調整してください。
  - ここでは `create_ssot` を例にしていますが、`generate_prompts` や `check` など他のワークフローにも差し替え可能です。
- `devos:check`
  - 現時点では「型チェック＋テスト」のみをまとめたシンプルなものです。
  - 将来的には lint / e2e / Storybook などを追加しても構いません。

---

## 2. GitHub Actions テンプレ（dev-OS ベースのチェック）

GitHub Actions で、PR や main ブランチへの push のたびに  
`npm run devos:check` を実行するテンプレート例です。

`.github/workflows/devos-check.yml` として配置することを想定します：

```yaml
name: DevOS Check

on:
  pull_request:
    branches: [ main, develop ]
  push:
    branches: [ main ]

jobs:
  devos-check:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: DevOS check (typecheck + tests)
        run: npm run devos:check
```

### メモ

- このテンプレは、**既存のSaaS開発フロー（typecheck + test）を dev-OS の枠で整理したもの**です。
- dev-OS 側のワークフロー `check` では、SSOTとして
  - `tsc --noEmit`（型チェック）
  - `npm test`（ユニットテスト）
  をステップとして定義しており、将来的にはここに lint や E2E などを追加できます。
- 将来フェーズでは、ここに「SSOTとコードの乖離チェック」「プロンプトLint」などの AI チェックを追加していく想定です。

---

## 3. dev-os-mvp 側でのワークフロードライラン実行例

`dev-os-mvp` リポジトリ自身で、`check` ワークフローを balanced モードでドライランした例です。

実行コマンド：

```bash
npx ts-node scripts/run_workflow.ts check --mode balanced
```

出力例：

```text
Workflow: check
Name: 開発チェックフロー
Description: TypeScript 型チェックやテストなど、マージ前に通すべきチェックを定義するフロー。

Mode: balanced
Mode description: PR向けの標準チェック。
Preset description: 品質と速度のバランスをとる標準モード

Options:
  (none)

Steps:
  1. role=runner
     slot=light
     model=gemini-2.0-pro
     input=tsc --NoEmit
     output=typecheck_result
     notes=TypeScript の型チェックを行う。

  2. role=runner
     slot=light
     model=gemini-2.0-pro
     input=npm test
     output=test_result
     notes=ユニットテストを実行する（現時点ではダミー想定でも可）。
```

このように、dev-OS 側では「どのステップで、どのスロット／モデルが、どのコマンドを担当するか」を SSOT として定義しておき、  
アプリ側では単純に `npm run devos:check` を CI に乗せるだけで、**既存の開発フローを dev-OS 経由で標準化する**ことができます。

実プロジェクト（例：OmotenasuAI）で dev-OS を実際に利用する際のステップバイステップの dogfooding ガイドは `docs/dogfood/README.md` を参照してください。


