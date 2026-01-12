# dev-os-mvp Dogfooding ガイド

## 1. 概要
dev-os-mvp は、SSOT・ワークフロー・LLM 構成を一元管理する「開発OSレイヤー」であり、実際のアプリ実装（例: OmotenasuAI）は別リポジトリで行います。ここでは「OmotenasuAI など実案件を開発するときに dev-os をどう使うか」を 1 周の流れで説明します。対象読者は、自分自身を含む開発者・プロダクトオーナーで、将来的に外部チームにも共有できる導入ガイドです。

## 2. 想定ディレクトリ構成（例）
ローカルでは、dev-os と実アプリを兄弟ディレクトリとして管理します（必要に応じて Git submodule などを使っても構いませんが、ここでは最もシンプルな構成を前提とします）。

```text
~/workspace/
  dev-os-mvp/         # このリポジトリ（開発OS）
  omotenasu-ai/       # 実アプリ（例：OmotenasuAI本体）
```

以下のステップは、この構成を前提に進めます。

## 3. 基本的な利用フロー（OmotenasuAI のダミー機能を例に）

### Step 1: やりたいことを実アプリ側で言語化
OmotenasuAI リポジトリで、新しい機能の背景や期待値を文章化します。例: 「宿泊プラン一覧 API で、プラン種別（スタンダード・プレミアム）、提供期間、料金帯でフィルタリングしたい。将来はプランごとの在庫連携まで拡張予定。」といった粒度で、背景・制約・顧客価値をまとめます。

### Step 2: dev-os 側で SSOT プランを洗い出す
`dev-os-mvp` ディレクトリに移動し、SSOT 生成系ワークフローの Plan（ドライラン）を確認します。CLI でも Web コクピットでもOKです。例:

```bash
cd ~/workspace/dev-os-mvp
npx ts-node scripts/run_workflow.ts create_ssot --mode balanced
```

または Web コクピットで purpose=`ssot`, mode=`balanced`, workflowId 空、title に「宿泊プラン一覧 API の拡張」、relatedSsot に現状の要約を入力して Plan を取得し、Drafter / Reviewer / Refiner のステップ構成と使用モデルを把握します。Phase1 では Plan（設計フローの可視化）までがメインで、SSOT YAML の自動生成は今後の拡張対象です。

### Step 3: プロンプト生成フローで実装AI向け指示を設計
同じく dev-os 側で `generate_prompts` ワークフローを balanced などで確認します。CLI 例:

```bash
npx ts-node scripts/run_workflow.ts generate_prompts --mode balanced
```

Web コクピットでは purpose=`prompt` を選び、title/context に「宿泊プラン一覧 API のフィルタリング要件」「関係する SSOT 抜粋」などを入力します。これにより、実装AIに渡すべきプロンプト骨子（Stepごとの入力/出力、参照すべきSSOT）が整理されます。

### Step 4: OmotenasuAI 側で Cursor 実装AIにプロンプト投入 → コード実装
Step3 で得たプロンプト素案を、OmotenasuAI リポジトリの Cursor（実装AI）に貼り付けます。関連する SSOT 抜粋や開発ルールを添え、具体的なコード生成を依頼します。生成結果は通常どおりレビュー・コミットし、必要なら dev-os 側に差分を戻します。

### Step 5: 実装後のフィードバックを dev-os に反映
実装して見えた知見は dev-os に戻します。例:
- `ssot/*.yml` の該当セクションを更新し、要求仕様の正本をアップデート。
- `workflows.yml` でステップや mode の調整が必要ならエントリを更新。
- 将来のテンプレ用に、今回作成したプロンプト素案を `docs/` や `outputs/` 配下に保存する計画を立てる。

このループにより、実アプリと dev-os の設計OSが常に同期されます。

## 4. コマンド例・具体的な操作例

### 4-1. CLI で Plan を確認する
```bash
cd ~/workspace/dev-os-mvp

# SSOT作成フローのプラン
npx ts-node scripts/run_workflow.ts create_ssot --mode balanced

# プロンプト生成フローのプラン
npx ts-node scripts/run_workflow.ts generate_prompts --mode balanced

# generate_prompts 用の RAG 設計（rag_profile）を確認する
npm run devos:plan-rag
```

出力された Plan で、step order / role / modelSlot / resolvedModel を確認し、必要に応じて mode を strict や fast に切り替えます。`npm run devos:plan-rag` では、`generate_prompts` と `impl.single_task` に紐づく RAG 設計（どの SSOT/ドキュメントをどのように参照するか）が JSON で確認できます。

### 4-2. Web コクピットで Plan を可視化する
```bash
cd ~/workspace/dev-os-mvp
npx ts-node apps/web-console/src/server/index.ts
# ブラウザで http://localhost:5100/public/index.html を開く
```

フォーム入力例（ダミー）:
- purpose: `prompt`
- mode: `balanced`
- workflowId: （空のまま）
- title: `宿泊プラン一覧APIのフィルタリング要件`
- relatedSsot: `features.yml の booking-management 抜粋や、必要な属性を箇条書き`

「Plan を取得」を押すと、Plan Summary / Steps / Current Mode Preset / JSON の順に可視化され、モデルチェーンを一目で把握できます。Model タブでは `GET/POST /api/llm-config` を使って Drafter/Reviewer/Light の割当を編集し、そのまま Plan に反映させられます。

## 5. 今後の拡張のヒント
将来的には、dev-os 側で `npm run devos:selfcheck` を CI に組み込み、OmotenasuAI 側の PR でも SSOT とコードの整合性チェックを走らせるなど、エコシステム的な “dogfooding” を進める計画です。また、Plan Viewer から直接 `/api/workflows/run` を叩いて LLM 実行まで自動化したり、Plane/Linear のチケット生成と連動する拡張も検討対象です。

## 6. Case 01: generate_prompts – Plan付きプロンプト生成の一周

### 概要

- 対象 Feature: `cursor-prompt-generation`（risk_level: high）
- 目的:
  - `generate_prompts` の Plan 情報（複数LLMフロー）を、Implementation AI 向けプロンプトにそのまま埋め込めるようにする。
  - 将来の RAG＋マルチLLM連携を見据え、「Plan をプロンプトに載せるためのレール」を敷く。

### 手順（実際にやったこと）

1. **Plan 確認**  
   - `generate_prompts` / `mode=balanced` で Plan を確認。  
     CLI か Web コクピットのどちらかで、steps / resolvedModel / featureId を目視確認した。

2. **設計フェーズ**  
   - `scripts/build_prompt.ts` に `--plan-text` オプションを追加する方針を決定。  
   - `ssot/prompt_templates.yml` の `impl.single_task` に「Plan 概要（LLMフロー構成）」セクションを条件付き（`{% if plan_text %}`）で追加する設計を決定。

3. **開発フェーズ**  
   - 上記 2 点を Implementation AI に依頼し、実装してもらった。  
   - `npx tsc --noEmit` 等で TypeScript エラーがないことを確認。

4. **動作確認**  
   - `--plan-text` なしで `npm run devos:build-prompt` を実行し、従来どおりの出力になることを確認。  
   - `--plan-text "Workflow: generate_prompts / Mode: balanced / Steps: ..."` を付けて実行し、プロンプト内に「# Plan 概要（LLMフロー構成）」ブロックが挿入されることを確認。

### 学び・メモ

- Plan 情報をプロンプトに載せるだけでも、Implementation AI 側が「どの LLM フローを前提にしているか」を誤解しにくくなる。  
- `--plan-text` を任意オプションとしておくことで、Phase 1.x では「手動で Plan 要約を渡す」運用に留めつつ、Phase 2 以降で「dev-OS が自動要約して渡す」方向にスムーズに拡張できる。

---

## 7. Case 02: プロンプト例だけで回す（外部repoに実指示・実装しない）

### 概要

- 目的:
  - 外部プロジェクト（例: `hotel-kanri` / `hotel-saas`）に **実際の開発指示を出せない状況** でも、
    dev-os-mvp 側の成果物として「Implementation AI にそのまま貼れる」プロンプト例を固定し、次タスクへ進むための足場にする。
- ポイント:
  - **外部repoのコードは変更しない**（実装は行わず、プロンプトの品質とフォーマットだけを検証する）。
  - 1タスク=1プロンプトとして、`DEV_RULES.md` の要求（スコープ明示・出力フォーマット）に沿って作る。

### 手順（やったこと）

1. **タスクを最小単位に切る（例）**
   - 「スタッフ招待画面のメールアドレス必須＋形式バリデーション追加」のように、UI上の小さい改善に限定。

2. **Implementation AI 向けプロンプトを作る**
   - 変更範囲（2〜3ファイル、バックエンドやDBは触らない等）を明確にし、Done条件と確認手順を必ず入れる。

3. **プロンプト例を dev-os-mvp に固定する（この節）**
   - 将来、同種タスクのテンプレ・チェック項目として再利用できるよう、ここに残す。

### 参考: Implementation AI プロンプト例（hotel-kanri / UIバリデーション）

```markdown
あなたは hotel-kanri リポジトリ専属の Implementation AI です。
TypeScript / フロントエンドフレームワーク（React / Vue など）とフォームバリデーションに精通し、
既に定義されている DEV_RULES.md と .cursorrules に従って安全に実装を行います。
- あなたは「設計」は行わず、与えられた仕様とスコープの範囲で実装に集中してください。
- 仕様面で不明な点がある場合は、推測で広げず「こう解釈した」と明記した上で最小限の実装に留めてください。
- 1ターンで変更してよいファイルは、原則 1〜3 ファイルまでです。

# リポジトリの前提
- リポジトリ名: hotel-kanri
- 主な目的:
  - ホテル運営・スタッフ運用のための管理画面（kanri）機能を提供する。
  - スタッフやユーザーを招待・管理する UI を含む。
- 開発ルール（要点）:
  - SSOTファースト: 仕様変更は SSOT / 仕様ドキュメントを通すこと（今回は UI バリデーション追加の範囲）。
  - 1タスクあたり 1つの目的＋関連 2〜3ファイルまで。
  - 変更内容は必ず「やったことの要約」「変更ファイル一覧」「重要な変更内容」「実行・確認方法」「次のアクション」を報告する。

# タスク概要
## タイトル
hotel-kanri スタッフ招待画面のメールアドレス必須＋形式バリデーション追加

## 目的
スタッフ招待（ユーザー追加）フォームのメールアドレス入力に、必須＋形式チェックのフロントバリデーションを追加し、
エラーメッセージ文言を既存ガイドラインとトーン・表記揺れなく揃える。

# 変更してよい範囲
- このタスクで変更してよいファイルは次の範囲に限定します:
  - スタッフ招待（またはユーザー追加）フォームコンポーネント 1ファイル
    - 例: `components/...InviteStaffForm.(tsx|vue)` のようなファイル（正確なパスはレポジトリ内を検索して特定してください）。
  - 必要に応じて、共通バリデーション・メッセージ定義 or フォーム関連テスト 1〜2ファイル。
- 合計 2〜3 ファイルまでに収めてください。
- バックエンド API 実装・DB スキーマ・インフラ設定には触れないでください。
- 上記以外のファイルを編集する必要があると判断した場合は、
  いったん提案レベルに留め、「別タスクとして切り出すべき理由」をコメントとして示してください。

# 関連する仕様・ルール
- 機能要件:
  1. メールアドレス入力フィールドを **必須** にする（未入力でバリデーションエラーが出る）。
  2. メールアドレス形式チェック（簡易な `xxx@yyy` 程度の判定でOK）を追加する。
  3. バリデーション失敗時のエラーメッセージ文言を、日本語で統一された文言にする。
     - 必須エラー（例）: `メールアドレスは必須項目です`
     - 形式エラー（例）: `正しい形式のメールアドレスを入力してください`
- 既存ガイドラインとの整合:
  - まず hotel-kanri リポジトリ内で「メールアドレス」に関する既存のエラー文言を検索し、
    既に使われているパターン（ログイン画面・ユーザー登録画面など）があれば、それを優先的に流用してください。
  - 新しい文言を定義する場合も、既存文言のトーン（敬体 / 「です・ます」調、句読点の有無など）に合わせてください。
- 技術的前提:
  - 既にフォームバリデーションライブラリ（例: yup / zod / VeeValidate / React Hook Form 等）や
    フレームワーク標準のバリデーション機構を使っている場合は、それに従って実装してください。
  - そういったライブラリがない場合は、既存フォームのバリデーション実装パターン（他の項目のチェック方法）に揃えてください。
- スコープ外:
  - サーバサイドのメールアドレスバリデーションロジックや API レスポンス仕様は、このタスクでは変更しません。
  - 他の入力項目（氏名・権限など）のバリデーション仕様は変更しません。

# Plan 概要（LLMフロー構成）
以下は、今回のプロンプト生成に使われた dev-OS 側の Plan 情報（generate_prompts / balanced）の要約です。
この Plan を前提として、設計・実装を行ってください。

- Workflow: `generate_prompts`
- Mode: `balanced`
- Steps:
  1. Drafter（modelSlot: `drafter`）
     - タスク定義・SSOT・DEV_RULES・.cursorrules・governance・command_tags から、
       Implementation AI 向けプロンプトの叩き台を生成する。
  2. Reviewer（modelSlot: `reviewer`）
     - Drafter のプロンプトが SSOT / ルール / ガバナンス違反になっていないかをチェックし、指摘を返す。
  3. Refiner（modelSlot: `drafter`）
     - Reviewer の指摘を取り込んだうえで、Implementation AI に渡す最終プロンプトを整形する。
- 参照される RAG ソース（概要）:
  - `ssot/features.yml`（cursor-prompt-generation）
  - `ssot/project.yml`
  - `ssot/prompt_templates.yml`（impl.single_task）
  - `workflows.yml`（generate_prompts）
  - `DEV_RULES.md` / `.cursorrules`
  - `ssot/governance.yml`（halt_protocol / forbidden_patterns など）
  - `ssot/command_tags.yml`（>> impl など）

# 完了の定義（Done の条件）
少なくとも次を満たしている必要があります:
- スタッフ招待（またはユーザー追加）フォームで、メールアドレス未入力時に「必須エラー」が表示されること。
- 不正な形式（例: `foo` や `foo@` など）を入力した場合に、「形式エラー」が表示されること。
- 正しい形式のメールアドレス（例: `test@example.com`）を入力した場合に、これらのエラーが表示されないこと。
- エラーメッセージ文言が既存ガイドラインとトーン・表記揺れなく整合していること
  （既存画面の文言に合わせているか、もしくは新規でもスタイルが揃っていること）。
- 既存のビルド・テスト（存在する場合）がエラーなく通ること。

# 回答フォーマット
次の構造で回答してください:
1. やったことの要約（2〜5行）
2. 変更ファイル一覧（相対パスと簡単な説明）
3. 重要な変更内容の抜粋（必要ならコードブロック）
4. 実行・確認方法（例: どの画面にアクセスし、どの入力でエラー／成功パターンを確認したか）
5. 次のアクション案（必要なら：追加で検討すべきバリデーション、大規模な改善タスクへの切り出し案など）

コードは ```ts や ```vue など適切な言語タグ付きで提示してください。
```

---

## 8. Case 03: devos_selfcheck 常用化（npm script + PRゲート）

### 概要

- 目的:
  - `scripts/devos_selfcheck.ts` を **ローカルでもCIでも常用**できる状態にする。
  - SSOT / command tags / governance / ragProfile などの参照不整合を **PR時点で早期に検知**する。
- スコープ（最小変更）:
  - `package.json`（npm script の入口）
  - `.github/workflows/` のメインCI相当 1本（selfcheck をPRごとに走らせる）

### 手順（実際にやったこと）

1. **npm script の入口を確認**
   - `package.json` に `devos:selfcheck` が存在し、`npm run devos:selfcheck` で `scripts/devos_selfcheck.ts` を実行できる状態であることを確認した。

2. **CI 側を「PRごとのゲート」にする**
   - `.github/workflows/devos-selfcheck.yml` が selfcheck を実行していたが、`pull_request` が `paths` フィルタ付きだったため「PRごとに必ず実行」ではなかった。
   - `pull_request` を **すべてのPRで発火**するように変更し、selfcheck 失敗時にCI全体が fail になるゲートとして扱える状態にした。

### 実行・確認方法

- ローカル:

```bash
npm run devos:selfcheck
```

- CI:
  - GitHub Actions の `devos selfcheck` ワークフローが、**すべての Pull Request** で実行される。
  - 失敗すれば PR のCIが fail になる。

### 学び・メモ

- `paths` 条件付きワークフローは「無駄な実行を減らす」のに有効だが、selfcheck のような **必須ゲート** には不向きになり得る。
  - 「PRごとに必ず走る」ことを最優先にするなら、`pull_request` の `paths` は付けない方が安全。

---

## 9. Case 04: Command Tag `>> prmt` 起点で一周回す（擬似運用）

### 概要

- 目的:
  - タグレイヤー（`ssot/command_tags.yml`）とガバナンス（`ssot/governance.yml`）、RAG計画（`workflows.yml` / `ssot/prompt_templates.yml`）が、
    実際に「`>> prmt` を起点にした 1 タスク」で整合しているかを検証する。
  - 外部リポジトリに実装指示を出さなくても、dev-os-mvp 側だけで **タグ → workflow → Drafter → Implementation AI プロンプト** までを一通り確認できるようにする。

> 注: v0.1 時点では「タグ入力を受け取って自動でワークフローを起動する」実行レイヤーは未完成のため、この Case は **擬似運用**（内部解釈を手動でなぞる）としてログ化する。

### 想定するタグ入力（チャット側イメージ）

```text
>> prmt COM-XXX
```

- `COM-XXX`: Plane 上の Issue 番号（ここでは擬似的に扱う）
- dev-OS がこの入力を受け取った想定で、内部解釈を手動でなぞる

### 前提（関連SSOT・実装の所在）

- `ssot/command_tags.yml`
  - `id: prmt`
  - `tag: ">> prmt"`
  - `defaultWorkflowId: generate_prompts`
  - `governanceProfile.haltTriggers` に `ssot-ambiguous` / `system-boundary-violation` / `tenant-isolation-risk` などが定義済み
- `workflows.yml`
  - `id: generate_prompts` が定義済み（Drafter / Reviewer / Refiner のステップ）
- `ssot/prompt_templates.yml`
  - `impl.single_task`（Implementation AI向けテンプレ）
  - `drafter.impl_prompt_draft`（Drafter用テンプレ）
  - `impl.single_task.rag_profile` に `command_tags` / `governance` 参照が含まれている
- `ssot/governance.yml`
  - `halt_protocol.triggers` に上記ID群が定義されている
- 実行系（dev-os-mvp 内）
  - `scripts/run_drafter.ts` が存在し、`generate_prompts` 用 Drafter を呼び出せる
  - `scripts/devos_selfcheck.ts` が通る状態であること

### 手順（実際にやったこと）

1. **タグ解釈（擬似）**
   - `>> prmt COM-XXX` を受け取った想定で、`ssot/command_tags.yml` の `id: prmt` を確認した。
   - `defaultWorkflowId: generate_prompts` と、`governanceProfile.haltTriggers` の存在を確認した。

2. **command_tags → workflows → governance の整合確認**
   - `workflows.yml` で `generate_prompts` が存在することを確認した。
   - `ssot/governance.yml` で `halt_protocol.triggers[].id` に、`command_tags.yml` の `haltTriggers` が存在する想定であることを確認した。

3. **Drafter 実行（generate_prompts）**
   - 擬似 Issue（`COM-XXX`）を「1タスク（2〜3ファイルの変更）」に落とした入力を用意し、Drafter を実行するコマンド例を整理した。

```bash
# 例: OpenAIキーが必要
OPENAI_API_KEY=... npx ts-node scripts/run_drafter.ts generate_prompts \
  --project hotel-kanri \
  --title "COM-XXX: （Issueタイトルを簡潔に）" \
  --goal "COM-XXX を 2〜3ファイル以内の変更で完了させる" \
  --change-scope "- 変更してよいファイル/領域（2〜3件）を箇条書きで" \
  --context "PlaneのIssue本文／補足メモを要約して記載"
```

   - `scripts/run_drafter.ts` は内部で `scripts/plan_rag.ts` を呼び出し、RAG Plan を解決した上で、
     `drafter.impl_prompt_draft` を使って Implementation AI 向けの `promptDraft` を生成する。
   - `--project` は v0.1 時点では `hotel-kanri|hotel-saas` のみ対応。RAG対象は `../hotel-kanri` または `../hotel-saas` の `docs/` と `src/` を読み取りに行く（存在しない場合は project context が空になる）。

4. **Implementation AI 用プロンプトとして採用**
   - 今回は「プロンプト例だけを成果物とする」方針のため、生成された `promptDraft` を Implementation AI 用プロンプト案として扱う。
   - Cursor 側への貼り付け・実実装は行わず、「ここで止める」運用パターンとしてログ化する。

5. **selfcheck 実行**
   - まとめとして dev-os-mvp で selfcheck を実行し、タグ・ワークフロー・ガバナンス参照が壊れていないことを確認する。

```bash
npm run devos:selfcheck
```

### 得られたアウトプット（概要）

- `>> prmt` を起点にした想定で、「タグ → workflow → governance → RAG Plan → Drafter → promptDraft」までの参照関係を dev-os-mvp 単体で説明できる状態になった。
- 外部repoへ実装を流さなくても、「プロンプトの筋が通っているか」「ガードレールがプロンプトに反映される想定か」を dev-os 側で検証できる。

### 学び・メモ

- 「タグ入力を起点に自動で実行する」レイヤーは今後の拡張（Phase 2+）だが、SSOTとガバナンスの参照関係はすでに揃っている。
- 次の改善候補:
  - `>> prmt` の入力（Issue ID / SSOT ID / change_scope_hint）を受け取って、`run_drafter` / `build_prompt` まで自動でつなぐ「実行レイヤー」を最小実装する。

---

## 10. Case 05: `>> prmt` から run_drafter まで回す（採用フェーズ / hotel-kanri）

> この Case は「実際の外部リポジトリに実装を流す」こと自体が目的ではなく、**dev-os-mvp 側で `>> prmt` 起点の“本番に近い1周”**（タグ → suggestedCommand → run_drafter → Implementation AI プロンプト生成）を行い、成果物（プロンプト本文と学び）を固定することが目的。

### 設定（今回の前提）

- 対象プロジェクト: `hotel-kanri`
- Issue ID: `COM-123`（プレースホルダー。実際にPlaneで切ったIDに置換する）
- 想定タスク例: `COM-123: 設定画面のエラーメッセージ改善（例）`

### 前提

- ローカルで `dev-os-mvp/` と `hotel-kanri/` が兄弟ディレクトリで存在すること（`run_drafter.ts` が `../hotel-kanri` を参照するため）
- `OPENAI_API_KEY` がローカル環境変数に設定できること
- `npm install` 済みで `ts-node` が利用できること

### 手順（実際にやったこと）

#### 1) タグ → suggestedCommand（`devos:tag`）

```bash
cd ~/workspace/dev-os-mvp
npm run devos:tag -- ">> prmt COM-123"
```

- 出力 JSON の `suggestedCommand` をコピーして使用する。
- 生成された雛形の `--project` が `hotel-kanri` になっていることを目視確認する。

#### 2) run_drafter 実行（人間が中身を埋める）

以下は `suggestedCommand` をベースに、Issue内容に合わせて `--title` / `--change-scope` / `--context` を埋めた例。

```bash
OPENAI_API_KEY=... npx ts-node scripts/run_drafter.ts generate_prompts \
  --project hotel-kanri \
  --title "COM-123: 設定画面のエラーメッセージ改善" \
  --goal "COM-123 を 2〜3ファイル以内の変更で完了させる" \
  --change-scope "- 変更してよいコンポーネント/ファイルを2〜3件で列挙" \
  --context "PlaneのIssue本文＋自分の補足メモを要約して記載"
```

#### 3) 出力された Implementation AI プロンプトを保存

- `run_drafter.ts` の stdout（JSON）から `promptDraft` を取り出し、この Case に貼り付けて保存する。
- ※APIキーや秘匿情報が混ざる場合は伏せ字にする（`OPENAI_API_KEY` の値は絶対に貼らない）。

### 得られたアウトプット（実績）

- 対象 Issue:
  - `DEV-001: run_drafter に --project dev-os-mvp を追加`（dev-os-mvp 自身を題材にした自己参照的 dogfooding）
- 使ったコマンド:
  - タグ解決: `npm run devos:tag -- ">> prmt DEV-001"`
  - Drafter 実行:

```bash
OPENAI_API_KEY=... npx ts-node scripts/run_drafter.ts generate_prompts \
  --project dev-os-mvp \
  --title "DEV-001: run_drafter に --project dev-os-mvp を追加" \
  --goal "dev-os-mvp 自身を題材に Case 05 を回せるようにする" \
  --change-scope "- scripts/run_drafter.ts（PROJECT_OPTIONS に dev-os-mvp を追加、ディレクトリ解決ロジック調整）" \
  --context "自己参照的 dogfooding のための改修。自リポジトリを RAG 対象にして Drafter を回す。"
```

- 生成された Implementation AI プロンプト（`promptDraft`）:

```text
あなたは dev-os-mvp リポジトリ専属の Implementation AI です。TypeScript / Node.js / ブラウザ向けフロントエンドに精通し、既に定義されている DEV_RULES.md と .cursorrules に従って安全に実装を行います。
- あなたは「設計」は行わず、与えられた仕様とスコープの範囲で実装に集中してください。
- 仕様面で不明な点がある場合は、推測で広げず「こう解釈した」と明記した上で最小限の実装に留めてください。
- 1ターンで変更してよいファイルは、原則 1〜3 ファイルまでです。
- SSOTや仕様が曖昧・不明な場合、またはシステム境界違反・テナント分離リスク等 high-risk な状況が検知された場合は、実装を進めず halt_report を作成し、人間または設計AIにエスカレーションしてください。

# リポジトリの前提
- リポジトリ名: dev-os-mvp
- 主な目的:
  - workflows.yml / workspace_llm_config.json に基づく「LLM実行プラン」の管理
  - CLI / Web コクピットからワークフロープランを可視化する
  - SSOT (ssot/*.yml) を正本として設計情報を管理する
- 開発ルール:
  - SSOTファースト: SSOTを通さない仕様変更は禁止
  - 1タスクあたり 1つの目的＋関連 2〜3ファイルまで
  - 変更内容は必ず「やったことの要約」「変更ファイル一覧」「重要な変更内容」「次のアクション」を報告

# タスク概要
## タイトル
DEV-001: run_drafter に --project dev-os-mvp を追加
## 目的
dev-os-mvp 自身を題材に Case 05 を回せるようにする

# 変更してよい範囲
- このタスクで変更してよいファイルは次の範囲に限定します:
  - scripts/run_drafter.ts（PROJECT_OPTIONS に dev-os-mvp を追加、ディレクトリ解決ロジック調整）
- 上記以外のファイルを編集する必要があると判断した場合は、いったん提案レベルに留め、別タスクとして切り出す前提でコメントしてください。

# 関連する仕様・ルール
- 本リポジトリは「SSOTファースト」「複数LLMチェック」を原則とし、設計・仕様変更は必ず ssot/*.yml を通して管理します。
- Implementation AI は設計判断を行わず、与えられた仕様・スコープ内でのみ実装を行います。不明点・曖昧な点があれば、推測せず明記し、最小限の対応に留めてください。
- 1タスクで変更するファイルは最大3つまでとし、スコープを超える場合はエスカレーションしてください。
- high-risk feature（cursor-prompt-generation）に該当するため、システム境界違反・テナント分離リスク・SSOT/コード/Issueの不整合・SSOTが曖昧な場合は、実装を進めず halt_report を作成し、必ずエスカレーションしてください。

# Plan 概要（LLMフロー構成）
このタスクは「generate_prompts」ワークフローに基づくプロンプト生成フローの一部です。  
- Drafter（実装AI）が task_definition + ssot_snippets をもとに prompt_draft を作成
- Reviewer が prompt_draft をレビューし、曖昧さ・抜け漏れ・禁止事項を指摘
- Refiner がレビューを反映し prompt_final を生成
- high-risk feature のため、各ステップでガバナンスチェック・halt_protocol が有効

# 完了の定義（Doneの条件）
少なくとも次を満たしている必要があります:
- TypeScript コンパイルエラーがないこと（npm run typecheck が通る前提）
- 既存ビルドやサーバー起動に支障がないこと

# 回答フォーマット
次の構造で回答してください:
1. やったことの要約（2〜5行）
2. 変更ファイル一覧（相対パスと簡単な説明）
3. 重要な変更内容の抜粋（必要ならコードブロック）
4. 実行・確認方法（例: コマンドやブラウザURL）
5. 次のアクション案（必要なら）

コードは ```ts や ```json など適切な言語タグ付きで提示してください。

# ガバナンス・ストップ条件（halt_protocol）
以下の状況が発生した場合は、実装を進めず halt_report を作成し、必ずエスカレーションしてください。
- SSOTや仕様が曖昧・確定不能（ssot-ambiguous）
- システム境界違反のリスク（system-boundary-violation）
- テナント分離リスク（tenant-isolation-risk）
- SSOT / コード / Issue の不整合（ssot-code-issue-mismatch）

# 注意
- 本タスクは自己参照的 dogfooding のための改修です。自リポジトリを RAG 対象にして Drafter を回せるようにすることが目的です。
- 変更範囲・設計意図・ガバナンスルールを厳守してください。
```

### 良かった点 / 足りなかった点（実績メモ）

- 良かった点:
  - **dev-os-mvp 自身を `--project` に指定して一周回せた**（自己参照的 dogfooding が成立）
  - promptDraft に **halt_protocol（ストップ条件）が自動で展開**されており、Implementation AI に守らせるべきガードレールが入っている
  - RAG ソースとして `ssot/*.yml` / `DEV_RULES.md` / `docs/dogfood/README.md` / `governance.yml` などが自動収集され、プロンプトに反映された
  - 構造が `impl.single_task` に準拠しており、そのまま Cursor 実装AI に貼れるレベル
- 足りなかった点:
  - `DEV_OS_SPEC.md` のパスが `docs/` 配下にあるため `resolved: false` になっていた（ルート直下にも置くか、パス解決を調整する必要あり）
  - 外部プロジェクト（hotel-kanri 等）は `../` で兄弟ディレクトリを探すが、dev-os-mvp は `process.cwd()` を使う分岐を入れたため、今後プロジェクト追加時は同様の対応が必要









