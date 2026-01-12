# DEV_OS_SPEC.md  
AI開発OS（仮称）構想 & 設計メモ v0.1  
─ OmotenasuAI 自家用MVP → 将来SaaS化まで見据えた設計 ─

---

## 0. このドキュメントの位置づけ

### 目的

- 「破綻しない AI 開発OS」（spec-first / SSOT / 複数LLMチェック）の構想を  
  Cursor＋ローカル開発でそのまま実装に落とすための“設計SSOT”としてまとめたもの。
- **IYASAKA ブランド・マスター・プロトコルに基づき、現場の「知恵」を整え、確信を創るためのインフラ（Foundation）として定義する。**
- 将来的に SaaS 化・クレジット課金・MCP 連携を行うことを見据えつつ、  
  まずは「自分用MVP」を作るための全体図と仕様のたたき台。

※ 開発ルールやロール分担などの詳細は、リポジトリルートの `DEV_RULES.md` を参照すること。
※ ブランド哲学については `docs/IYASAKA_BRAND_PROTOCOL.md` を参照すること。

### 想定フェーズ (SaaS-first PLG ロードマップ)

1. **Phase 1：Foundation（コアエンジン & コンソール基盤）**
   - SSOT（仕様正本）からプロンプト・ガイドを生成する中核ロジックの構築。
   - `apps/web-console` での実行プラン可視化。
   - 自分のプロジェクト（OmotenasuAI等）への実戦投入とフィードバック。

2. **Phase 2：SaaS Platform（PLG基盤の構築）**
   - Supabase Auth による認証、組織・ワークスペース管理。
   - `ssot/pricing.yml` に基づく Free プランの実行制限・カウント機能。
   - LP v2.0 公開と「不」から「光」へ誘うウェイトリスト運用。

3. **Phase 3：Alpha / Early Access（課金・BYOキー連携）**
   - Stripe Billing 連携（Pro/Team プランの課金開始）。
   - BYO（APIキー持ち込み）機能の暗号化保存と実行エンジンへの組み込み。
   - クローズドアルファによる LTV・チャーン・価値の検証。

4. **Phase 4：Expansion & Ecosystem（外部連携・自動化）**
   - GitHub/GitLab 自動コミット連携。
   - Linear/Plane との双方向タスク同期。
   - MCP サーバ化による Cursor 等の IDE との深い統合。

このドキュメントは、上記3フェーズすべてを視野に入れつつ、  
今すぐ実装できるMVP（Phase 1）からブレないように設計の背骨をまとめたもの。

---

## 1. コンセプト & ターゲット

### 1-1. プロダクトコンセプト

**コンセプト（IYASAKA Narrative OS）**

> 「AIで作ったコード、結局自分で直してませんか？」  
> AI開発の「不透明・不安」を「確信」へと変換する、  
> 現場の知恵（SSOT）を整えるための AI 開発品質管理プラットフォーム。

**「バイブコーディング」の限界を、設計の力で突破する。**
感覚（バイブス）でプロンプトを打ち続ける「漂う開発」はもう終わりです。dev-OS は、SSOT（仕様正本）を全ての中心に据え、AI が「何を作るべきか」を 100% 理解した状態で筆を執る環境を提供します。

**ねらい**

- 単なる「AIコーディング補助」ではなく、設計・SSOT・プロンプト・ガバナンスを一元管理する“OS層”を提供する。
- PLG（Product-Led Growth）モデルを採用し、Free プランから段階的にチーム・企業導入へと価値を繋ぐ。
- ターゲットペルソナ「孤軍奮闘CTOのタカシさん」の切実なペイン（AI生成コードの品質不安・手直しコスト）を直接解決する。
- 複数LLMによる多重監査（Market / Strategy / Brand / Drafter / Reviewer）で、ビジネス価値と技術品質の両立を保証する。

### 1-2. ターゲット（ペルソナ）

詳細は `ssot/personas.yml` を参照。

1. **Primary: 孤軍奮闘CTO（タカシさん）**
   - 4〜8人のチームで、AIをフル活用して爆速開発したいが、品質のバラツキと自分のレビュー負荷に限界を感じている。
2. **Secondary: インディー開発者（ユウキさん）**
   - 1人でSaaSを完結させたいが、認証・課金・マルチテナント等の「正解」が分からず不安。
3. **Tertiary: 開発スタジオ経営者（ケンジさん）**
   - 複数プロジェクトの品質を標準化し、ジュニアメンバーでもAIを安全に使いこなせる体制を作りたい。

---

## 2. マーケティング・ファースト・アーキテクチャ

dev-OS は、開発プロセスの最上流に「3極のマーケティング・オーケストレーション」を配置し、PMF（Product Market Fit）達成までの時間を劇的に短縮します。

### 2-1. 3つの専門極と責任

1. **Market Analyst (市場の足場)**
   - **役割**: VoC（顧客の声）、競合、トレンドの客観的分析。
   - **SSOT**: `ssot/market_analysis.yml`, `ssot/personas.yml`
2. **Strategy Designer (価値の中心)**
   - **役割**: 独自の価値定義（Value Proposition）、価格戦略、成長ループ（PLG）の設計。
   - **SSOT**: `ssot/value_proposition.yml`, `ssot/pricing.yml`, `ssot/growth_model.yml`
3. **Brand Guardian (品格の出口)**
   - **役割**: IYASAKA ナラティブへの昇華、ブランドの誠実さ・倫理の監査。
   - **SSOT**: `ssot/messaging_guide.yml`, `ssot/brand_voice.yml`

### 2-2. レイヤー構造

1. **UXレイヤー（ユーザーが触る部分）**
   - Workspace単位での設定：
     - Drafter / Reviewer / Light モデルの選択
     - モード選択（Fast / Balanced / Strict）
   - 組織（Organization）およびワークスペース（Workspace）の閲覧・編集UI
   - （SaaS化後）クレジット残量やAPIキー設定、Stripe連携など

2. **オーケストレーションレイヤー（ワークフローエンジン）**
   - `workflows.yml` で定義されたワークフローを実行する。
   - 各ワークフローは：
     - 名前（例：`create_ssot`）
     - モードごとのステップ（Fast / Balanced / Strict）
     - 各ステップの `role`（drafter/reviewer/refiner） と `modelSlot` を持つ。
   - 「DrafterでSSOTドラフト → Reviewerでチェック → Refinerで統合」  
     といった流れを制御。
   - 実行ログを `execution_log` に記録し、ガバナンスと連動。

3. **LLMアダプタ & SSOTレイヤー（裏側ロジック）**
   - SSOTの構造化データ管理（YAML/JSON）
   - `ssot/platform.yml` に基づくマルチテナント・認証・認可の制御。
   - コンテキスト抽出・差分生成・RAG的参照
   - キャッシュ管理（入力＋モード＋ワークフロー単位）
   - トークン計測・クレジット消費計算
   - 実際の LLM API 呼び出し（OpenAI/Anthropic/Google 等）

### 2-2. コードの所在 & 開発環境

- アプリケーションコード（実装）はこのOSには持たせない。
  - コードはユーザーの Git リポジトリ（GitHub / GitLab / 自前Git / ローカル）に置く。
  - 開発環境は Cursor / VSCode / 他IDE。
- このOSの責務：
  - SSOT / 仕様 / タスク / プロンプト / `.cursorrules` / `AI_GUIDE.md` などの  
    「設計情報の正本」だけを持つこと。
  - 将来的には GitHub API 経由で、対象リポジトリにこれらをファイルとして送る。

**Phase 1（自分用MVP）**

- dev-OS用リポジトリ（ローカル）と、
- 実際のプロダクトリポジトリ（OmotenasuAIなど）を分ける。
- dev-OSの `outputs/AI_GUIDE.md` / `.cursorrules` を  
  手動 or スクリプトでプロダクト側にコピーして使う。

---

## 3. 想定する開発フロー（抽象）

1. **ヒアリング & プロダクトラフ作成**
   - AIとの対話を通じて：
     - プロダクトのゴール
     - ペルソナ
     - 主なユースケース
     - VMV（Vision / Mission / Value）
   をラフにまとめる。

2. **必要な仕様書セットの提案 & 作成**
   - ラフ情報からAIが「必要な仕様書セット」を提案：
     - プロダクト概要 & VMV
     - ドメイン用語集
     - ユースケース一覧
     - エンティティ（概念ER）
     - SaaS共通要件（認証/権限/マルチテナント/課金/監査ログ/ログ基盤など）
     - 主要API概要 / UIビュー一覧
   - 草案はAIが作成し、人間＋複数LLMで整える。

3. **実装機能（feature）一覧の生成**
   - 仕様から、実装単位の feature 一覧を生成：
     - 例：`booking-management`, `member-tier`, `billing-subscription` など。
   - feature ごとに優先度・依存関係を付与。

4. **機能ごとの SSOT 作成**
   - 各 feature に対して、構造化された SSOT キャンバスを作成。
   - 全自動ではなく、「テンプレ提示 → 人間が埋める → 複数LLMでレビュー」の半自動＋対話型にする。

5. **SSOT → タスク（チケット）生成**
   - 各 feature SSOT から：
     - Backend タスク
     - Frontend タスク
     - Infra/CI/テストタスク
   を抽出し、Linear/Plane等に流せる形にする。

6. **タスク → 開発AI用プロンプト生成**
   - タスク単位で：
     - 関連SSOT
     - 守るべき規約
     - 具体的指示
     - 出力フォーマット  
     を含んだプロンプトを生成。
   - `.cursorrules` / `AI_GUIDE.md` にも反映させる。

7. **実装（Cursor側で行う）**
   - 開発者は Cursor 上でタスクを選び、
     - dev-OS が出したプロンプトと SSOT を元に実装。
   - dev-OS は「設計とルールのSSOTとして横にいる存在」。

---

## 4. SSOT & ワークフロー定義の仕様

### 4-1. Workspace LLM設定（ユーザー側）

`ssot/platform.yml` に定義されたデータ構造に基づき、マルチテナント・認証・認可を前提とした設定管理を行う。

```jsonc
{
  "workspaceId": "omotenasu-ai-core",
  "presets": [
    {
      "id": "default-balanced",
      "name": "Balanced / 品質とコストのバランス",
      "description": "設計はSonnet、レビューはGPTが担当する標準構成",
      "modelSlots": {
        "drafter": { "provider": "anthropic", "model": "claude-3.7-sonnet" },
        "reviewer": { "provider": "openai", "model": "gpt-5.1" },
        "light": { "provider": "openai", "model": "gpt-4.1-mini" }
      }
    },
    {
      "id": "fast-and-cheap",
      "name": "Fast / 軽量・試行錯誤用",
      "description": "叩き台づくり中心。軽量モデルのみで回す構成",
      "modelSlots": {
        "drafter": { "provider": "openai", "model": "gpt-4.1-mini" },
        "reviewer": { "provider": "google", "model": "gemini-2.0-flash" },
        "light": { "provider": "google", "model": "gemini-2.0-flash" }
      }
    },
    {
      "id": "strict-quality",
      "name": "Strict / 品質優先モード",
      "description": "高性能モデル＋複数レビューでSSOTをロックする構成",
      "modelSlots": {
        "drafter": { "provider": "anthropic", "model": "claude-3.7-sonnet" },
        "reviewer": { "provider": "openai", "model": "gpt-5.1" },
        "light": { "provider": "google", "model": "gemini-2.0-flash" }
      }
    }
  ],
  "activePresetId": "default-balanced"
}
```

### 4-2. ワークフロー定義（内部仕様）

```yaml
workflows:
  create_ssot:
    label: "SSOT新規作成"
    modeOverrides:
      fast:
        steps:
          - role: drafter
            modelSlot: drafter
            input: ssot_brief
            output: ssot_draft
          - role: reviewer
            modelSlot: reviewer
            input: ssot_draft
            output: review_notes
      balanced:
        steps:
          - role: drafter
            modelSlot: drafter
            input: ssot_brief
            output: ssot_draft
          - role: reviewer
            modelSlot: reviewer
            input: ssot_draft
            output: review_notes
          - role: refiner
            modelSlot: drafter
            input:
              - ssot_draft
              - review_notes
            output: ssot_final

  review_ssot:
    label: "既存SSOTの差分レビュー"
    modeOverrides:
      fast:
        steps:
          - role: reviewer
            modelSlot: reviewer
            input: ssot_diff
            output: review_notes
      balanced:
        steps:
          - role: reviewer
            modelSlot: reviewer
            input: ssot_diff
            output: review_notes
          - role: refiner
            modelSlot: drafter
            input:
              - ssot_new
              - review_notes
            output: ssot_final

  generate_tasks:
    label: "SSOTからタスク一覧生成"
    modeOverrides:
      fast:
        steps:
          - role: drafter
            modelSlot: light
            input: ssot_final
            output: task_list
      balanced:
        steps:
          - role: drafter
            modelSlot: drafter
            input: ssot_final
            output: task_list
          - role: reviewer
            modelSlot: reviewer
            input: task_list
            output: task_review
          - role: refiner
            modelSlot: drafter
            input:
              - task_list
              - task_review
            output: task_list_final

  generate_prompts:
    label: "タスクからCursor用プロンプト生成"
    modeOverrides:
      fast:
        steps:
          - role: drafter
            modelSlot: drafter
            input: task_definition
            output: cursor_prompt
      balanced:
        steps:
          - role: drafter
            modelSlot: drafter
            input: task_definition
            output: cursor_prompt_draft
          - role: reviewer
            modelSlot: reviewer
            input: cursor_prompt_draft
            output: prompt_review
          - role: refiner
            modelSlot: drafter
            input:
              - cursor_prompt_draft
              - prompt_review
            output: cursor_prompt_final
```

### 4-3. SSOTスキーマ v0.1（たたき台）

```yaml
project:
  id: "omotenasu-ai"
  name: "OmotenasuAI PMS / Concierge OS"
  description: "ホテル向けAIコンシェルジュ＋PMSの統合プロダクト"
  vmv:
    vision: "AIによって世界を均一化するのではなく、日本のおもてなしの『和の精神』を一歩先のかたちで世界へ広げる。"
    mission: "言語・時間・情報の壁をAIでサポートし、ホテルスタッフがより大きな価値創出に集中できる環境をつくる。"
    values:
      - "現場ファースト"
      - "おもてなしの尊重"
      - "誠実と安心"
      - "多様性と調和"
      - "未来への進化"
  domains:
    - "hotel"
    - "pms"
    - "ai_concierge"

glossary:
  - key: "Guest"
    jp: "ゲスト"
    definition: "宿泊者・利用者。予約・チェックイン・滞在・チェックアウトを通してサービスを受ける主体。"
  - key: "Plan"
    jp: "宿泊プラン"
    definition: "料金と条件（宿泊日数・食事有無など）がセットになった販売単位。"
  - key: "Tenant"
    jp: "テナント"
    definition: "本システムを契約するホテル事業者単位。マルチテナントの隔離単位。"

entities:
  - name: "User"
    description: "システムにログインするスタッフ・管理者"
    fields:
      - name: "id"
        type: "UUID"
      - name: "email"
        type: "string"
      - name: "role"
        type: "enum"
        enumValues: ["front_staff", "manager", "system_admin"]
  - name: "Tenant"
    description: "ホテル単位のテナント"
    fields:
      - name: "id"
        type: "UUID"
      - name: "name"
        type: "string"

features:
  - id: "booking-management"
    name: "予約管理"
    summary: "予約の登録・閲覧・変更・キャンセルを行う機能群。"
    usecases:
      - id: "booking.create"
        actor: "Staff"
        goal: "新規宿泊予約を登録する"
        trigger: "電話・Web・外部OTAからの問い合わせ"
      - id: "booking.search"
        actor: "Staff"
        goal: "既存予約を条件で検索する"
    apis:
      - id: "POST /api/bookings"
        summary: "新規予約作成"
      - id: "GET /api/bookings"
        summary: "予約一覧取得"
    ui_views:
      - id: "booking-list-page"
        description: "予約の一覧・検索画面"
      - id: "booking-detail-modal"
        description: "予約詳細・編集モーダル"
    non_functional:
      auth_required: true
      roles_allowed:
        - "front_staff"
        - "manager"
      audit_log: true
      tenant_isolation: "row_level"
      pii_handling: "masked_in_logs"
```

---

## 5. マルチLLMロジック（品質とコスト）

### 5-1. 単一LLM完結を前提にしない

- 単一LLMに SSOT やプロンプトを任せると、
  - 体感 10〜20% 程度の「見当違い」「危うい抜け」が混ざる。
- これを避けるため、以下の3役構成を標準とする：
  - Drafter（案出し）
  - Reviewer（チェック）
  - Refiner（統合）

### 5-2. 3役の役割

- **Drafter**：初稿を作る（SSOTドラフト、仕様草案、プロンプト叩き台など）。
- **Reviewer**：Drafter出力をレビューし、指摘リストを返す。
  - 用語・前提の一貫性
  - SaaS共通要件の抜け
  - セキュリティ / 認証 / テナント / 課金
  - プロンプト品質（ゴール・制約・出力形式・禁止事項）
- **Refiner**：Drafter出力＋Reviewer指摘を取り込み、最終版を再出力する。

### 5-3. モード別呼び出しパターン

- **Fast**
  - Drafter 1回
  - Reviewer 1回
- **Balanced**
  - Drafter 1回
  - Reviewer 1回
  - Refiner 1回
- **Strict**
  - Drafter 1回
  - Reviewer 2回（異なるモデル）
  - Refiner 1回

---

## 6. LLMコスト & 料金プラン設計（SaaS化 v2.0）

詳細は `ssot/pricing.yml` を参照。

### 6-1. 基本方針

- **PLG（Product-Led Growth）ファースト**: 無料で「確信」を体験できるエントリーポイント（Free プラン）を提供。
- **価値の階段**: 
  - Free (¥0): 評価・個人開発初期（ワークフロー月10回制限）
  - Pro (¥4,980): 個人開発・フリーランス（無制限、多重監査）
  - Team (¥29,800〜): SaaS開発チーム（シートライセンス、ガバナンス、連携強化）
  - Enterprise (¥200,000〜): 企業導入（SSO、SLA、監査ログ、専任サポート）
- **BYO（APIキー持ち込み）対応**: データの安全性と透明性を重視。

### 6-2. 技術的な制限の実装（検討事項）

- **リテンション制御**: プランに応じて `execution_log` の保存期間を自動パージする仕組み（Freeは7日など）。
- **実行数カウント**: 月間のワークフロー実行数を `execution_log` からリアルタイムに集計し、Free プランの制限（月10回）を適用。
- **シートライセンス**: `organization_member` の数に基づき、Stripe 連携で従量課金（Team プラン）を自動更新。

---

## 7. 自分用MVP（Phase 1）設計

### 7-1. リポジトリ構成案

```text
dev-os-mvp/
  ├─ ssot/
  │   ├─ project.yml        # プロジェクト概要・VMV・用語
  │   └─ features.yml       # 機能SSOT（最初は1〜2機能でOK）
  ├─ workflows.yml          # ワークフロー定義
  ├─ workspace_llm_config.json
  ├─ scripts/
  │   └─ run_workflow.ts    # or run_workflow.py – CLI実行用
  ├─ outputs/
  │   ├─ AI_GUIDE.md        # 自動生成 → OmotenasuAIリポジトリへコピー
  │   └─ .cursorrules       # 自動生成 → 同上
  └─ README.md
```

他プロジェクトへの導入例（npm scripts / GitHub Actions テンプレートなど）は、`docs/devos_integration.md` を参照すること。

### 7-2. MVP v0.1 のスコープ

1. `project.yml` を作る（OmotenasuAI用）。
2. `workflows.yml` では以下2つだけサポート：
   - `create_ssot`
   - `generate_prompts`
3. CLI例：

```bash
# SSOT作成（balancedモード）
bun ts-node scripts/run_workflow.ts create_ssot --mode balanced

# タスク定義からCursor用プロンプト生成
bun ts-node scripts/run_workflow.ts generate_prompts --task-id booking-api-001
```

4. 実行結果：
   - `ssot/features.yml` の該当機能SSOTが更新される。
   - `outputs/AI_GUIDE.md` / `.cursorrules` が生成される。
   - それをOmotenasuAIリポジトリにコピーしてCursorで利用。

### 7-3. MVPの目的

- OmotenasuAI 開発に実際に適用して、
  - 本当に開発が楽になるか？
  - SSOTとプロンプトの品質が安定するか？
  - どんな項目が不足しているか？
  を自分の痛みとしてフィードバックを取る。

- 「毎回このツールを通した方が楽だ」と感じる状態になったら、  
  Phase 2（MCP・GitHub連携）／Phase 3（SaaS化）へ進む。

### 7-4. Phase 1-WebConsole（自分用ブラウザコクピット）

- 目的：
  - ローカル or 開発環境で動く「自分用 Web コンソール（apps/web-console）」を用意し、
    - プロンプト作成・レビュー
    - SSOT（YAML）の草案作成・レビュー
    を、既存の `workflows.yml` / `workspace_llm_config.json` に基づいてブラウザから行えるようにする。
- 役割：
  - Web コンソールはあくまで **SSOTのクライアントレイヤー** であり、SSOT の正本は引き続き `ssot/*.yml` と `DEV_OS_SPEC.md` / `DEV_RULES.md` に置く。
  - Phase 1 では Web 側から SSOT を自動上書きせず、
    - Web UI で下書き → YAML テキストとして提案 → 人間が確認して `ssot/*.yml` に反映
    というフローを前提とする。
- ディレクトリ構成上の位置づけ：
  - `core/` 相当（ssot / workflows / scripts など）と分離し、Web コンソールは `apps/web-console/` 以下に配置する。
  - apps 層は dev-OS コアを「利用する側」として設計し、コア設計（SSOTスキーマ・ワークフロー定義）には影響を与えない。
- LLM 実行レイヤーについて：
  - Phase 1 では、Web コンソール側は
    - `workflows.yml`
    - `workspace_llm_config.json`
    を読み込んで実行プラン（Drafter / Reviewer / Refiner などのチェーン定義）を JSON で返す API までとし、実際の LLM API 呼び出しは Phase 2 以降の実装事項とする。
- モデル設定UI（Modelタブ）について：
  - Phase 1 ではテキスト入力のみでモデルIDを手入力する方式とし、空欄や "unresolved" を許容しない厳格なバリデーションを維持する。
  - 将来的には `ssot/models.yml`（モデルカタログSSOT）を定義し、候補リストやモーダルでモデルを選べるUXを Phase 2 以降のテーマとして検討する。

### 7-5. Phase 2: RAG＋マルチLLM実行レイヤー（設計メモ v0.1）

対象の high-risk feature 第1号は `cursor-prompt-generation`（`generate_prompts`）とする。

#### 7-5-1. RAG コーパス候補

- SSOT:
  - `ssot/features.yml`（特に `cursor-prompt-generation`）
  - `ssot/prompt_templates.yml`（`impl.single_task`）
  - `workflows.yml`（`generate_prompts` ワークフロー）
- ドキュメント:
  - `DEV_OS_SPEC.md` / `DEV_RULES.md`
  - `docs/dogfood/README.md` の実戦ログ（Case 01 など）

#### 7-5-2. Phase 2 で目指す状態（generate_prompts）

- Drafter LLM:
  - 上記コーパスを RAG しながら、Implementation AI 向けプロンプトのラフ案を自動生成する。
- Reviewer LLM:
  - ラフ案が SSOT / ルール / 設計テンプレに違反していないかをチェックし、
  - 抜け漏れ・リスク・あいまい表現を指摘する。
- Refiner LLM:
  - Reviewer の指摘を踏まえて、実際に実装AIに渡せる最終プロンプトを組み立てる。

※Phase 2 では「実際の LLM 呼び出し」までは踏み込まず、まずは `generate_prompts` ワークフローの拡張設計と、RAG 入出力インタフェースの仕様整理を行う。

#### 7-5-3. Drafter 実行インターフェース（run_drafter）の設計メモ v0.1

Phase 2 の最初の実装対象は、`generate_prompts` の Drafter ステップとする。ここでは、実行レイヤーにおける Drafter 呼び出しの I/F を定義し、まだ具体的な LLM クライアント実装には踏み込まない。

- 入力（Input）
  - `rag_plan`: `scripts/plan_rag.ts` で出力される RAG 設計 JSON。
    - `workflowId`, `templateId`, `featureId`, `ragProfileId`, `sources[]`, `queryHints[]`, `mustRespect[]` を含む。
  - `task`: この Drafter が対応するタスク情報。
    - `title`: タスクタイトル。
    - `goal`: 何を達成したいか（ビジネスゴール）。
    - `changeScope`: 触ってよいファイル・レイヤーの範囲。
    - `context`: 補足コンテキスト（SSOT抜粋や前提条件メモなど）。
  - `mode`: `fast` / `balanced` / `strict` などワークフローモード（将来のトークン制御・品質制御のフラグ）。

- 出力（Output）
  - `promptDraft`:
    - Implementation AI 向けプロンプトのラフ案テキスト（最終テンプレに流し込む前のドラフト）。
  - `usedSources`:
    - `rag_plan.sources` のうち、実際に RAG 結果として参照したソースのリスト。
    - それぞれについて、どの部分（例: パス or セクション）を読んだかのメタデータを持てるようにしておく（v0.1 ではプレースホルダ可）。
  - `trace`:
    - 入力パラメータ（task / mode / featureId など）と RAG 実行の概要ログ（どの queryHints を重視したか等）。

- エラー時の扱い（v0.1）
  - RAG で必要なソースが unresolved（存在しない）場合：
    - Drafter 実行前にエラーとして検知し、「どの source.key が unresolved か」を明示する。
  - LLM 側エラーやタイムアウトについては、Phase 2.1 では「人間による再実行を前提」とし、リトライポリシーはまだ設計しない。

- 呼び出し単位
  - `run_drafter` は 1 タスク単位で呼び出されることを想定する（1タスク = 1つの Implementation AI プロンプト）。
  - 将来的に複数タスクをバッチ処理したい場合は、別 I/F（例: `run_drafter_batch`）を設計する。

---

### 7-6. Command Tags レイヤーとガバナンスの位置づけ（v0.1）

本節では、会話ベース開発における「タグ付きコマンド」と、その裏で動く SSOT / ガバナンスの関係を定義する。

#### 7-6-1. Command Tags の役割

- 開発者と AI の通常会話とは別に、先頭に `>>` を付けたタグを「開発ワークフローの正式なエントリーポイント」として扱う。
- タグは **「どの種類の仕事をさせたいか」** を明示するスイッチであり、dev-OS 上では  
  `tag → ssot/command_tags.yml → workflows.yml → governance.yml → prompt_templates / RAG`  
  という経路で解釈される。

現時点（v0.1）で定義しているタグは以下のとおり（詳細は `ssot/command_tags.yml` を正とする）。

- `>> write` : 新規SSOT作成
- `>> impl`  : 既存SSOTに基づく実装
- `>> fix`   : バグ・不整合修正
- `>> rfv`   : SSOT / プロンプトのレビュー（review）
- `>> next`  : 次に着手すべきIssueの選定（Plane連携）
- `>> prmt`  : Implementation AI 向けプロンプト生成（generate_prompts）

**ルール：**

- タグなしメッセージ … 通常の雑談・相談・設計ディスカッション。  
- `>> xxx` で始まるメッセージ … 「決め打ちのワークフローを起動してほしい」という明示的な指示。  
- タグの意味・挙動の正本は `ssot/command_tags.yml` に置き、コードやドキュメントは SSOT に追従する。

#### 7-6-2. command_tags.yml の構造（人間向けサマリ）

`ssot/command_tags.yml` では、各タグを次のような項目で定義する（キー名は実ファイルを正とする）。

- `id` / `tag` / `label` / `description`
  - 人間に分かりやすい名前と説明。
- `defaultWorkflowId`
  - 実際に呼び出す `workflows.yml` 側の `id`（例: `create_ssot`, `generate_prompts`, `impl_feature` など）。
- `defaultMode`
  - `fast / balanced / strict` のどのモードを既定にするか。
- `requiredIntegrations`
  - このタグが前提とする外部とのつながり（例: `ssot`, `plane`, `governance`, `prompt_templates`）。
- `inputs`
  - タグ使用時に最低限必要な入力（例: SSOT名 / Issue番号 / 簡易説明など）。
- `outputExpectations`
  - そのタグで期待するアウトプット（例: SSOTドラフト / 実装プラン / プロンプト本文 など）。
- `governanceProfile`
  - `halt_protocol` とどう結びつくかを示す小さなプロフィール。
  - 例：`useHaltProtocol: true` / `haltTriggers: ["system-boundary-violation", ...]`

**開発者視点のポイント：**

- 「タグを追加・変更したいとき」は、まず `command_tags.yml` を編集し、その後で `workflows.yml` / `governance.yml` / prompt テンプレを追従させる。
- 逆に、コード側から勝手に新しい「モード」や「ワークフロー」を増やさない。必ず SSOT から。

#### 7-6-3. ガバナンスと halt_protocol

`ssot/governance.yml` は、dev-OS 全体のガバナンスの正本であり、特に `halt_protocol` は  
**「ここまで来たら必ず一度止まる」** ための共通ルールを定義する。

現時点での主なトリガー（例：IDのみ）：

- `ssot-ambiguous` : SSOTを安全に確定できない（仕様あいまい・候補が複数など）
- `system-boundary-violation` : システム境界（他システムDBや認証境界など）を跨ぐ危険な提案・変更
- `tenant-isolation-risk` : マルチテナント分離を壊す可能性（tenant_id 無視、フォールバックなど）
- `ssot-code-issue-mismatch` : SSOT / コード / Issue のどれが正か決められない不整合
- `cause-not-found-over-time` : 一定時間調査しても原因が特定できない

各タグは `command_tags.yml.governanceProfile.haltTriggers` 経由で  
「どのトリガーを特に意識すべきか」を `governance.halt_protocol.triggers` と 1:1 で紐付ける。

#### 7-6-4. タグ・ガバナンスと RAG / Drafter / Implementation AI の関係

dev-OS では、タグとガバナンス情報を **RAG とプロンプト生成に流し込む**ことで、  
会話ベース開発でも破綻しないようにしている。

- Drafter（generate_prompts の Drafter LLM）
  - `ssot/prompt_templates.yml` の `drafter.impl_prompt_draft` テンプレートを使用。
  - `rag_profile.sources` 経由で次を参照する：
    - `features.yml` / `workflows.yml` / `DEV_RULES.md` / `DEV_OS_SPEC.md`
    - `.cursorrules`
    - `command_tags.yml`（使用中タグの requiredIntegrations / outputExpectations / haltTriggers）
    - `governance.yml`（特に `halt_protocol`）
  - これらを要約して、Implementation AI 用プロンプトに「守るべきガードレール」として埋め込む。

- Implementation AI（impl.single_task）
  - Drafterが生成したプロンプトを前提に、実際のコード変更を行う役割。
  - プロンプト内で `governance.halt_protocol` に触れている場合、
    - 該当トリガーに引っかかった時点で「実装を進めず halt_report を出す」旨を守る前提。

#### 7-6-5. selfcheck との連携

`scripts/devos_selfcheck.ts` は、タグレイヤーとガバナンスの **整合性が壊れていないか** を自動チェックする。

主なチェック観点（例）：

- `command_tags.commands[].defaultWorkflowId` が `workflows.yml.workflows[].id` のいずれかに必ず存在すること。
- `command_tags.commands[].governanceProfile.haltTriggers[]` が  
  `governance.halt_protocol.triggers[].id` のいずれかに必ず存在すること。
- `command_tags.commands[].id` / `tag` の重複がないこと。
- `workflows.workflows[].ragProfileId` が `ssot/prompt_templates.yml` 内の `rag_profile.id` と一致していること。

開発者は **新しいタグや workflow、ガバナンスルールを追加・変更した場合**、必ず

- ローカルで `npm run devos:selfcheck`
- PR 上で CI の selfcheck ジョブ

が通ることを確認する。  
これにより「タグを増やしたら、どこかの SSOT 参照が壊れていた」という事故を最小化する。

## 8. 将来拡張（MCP / GitHub連携）

### 8-1. MCP連携構想

- dev-OSを MCP サーバとして公開し、Cursorから：
  - `getProject(projectId)`
  - `getFeature(featureId)`
  - `listTasks(featureId)`
  - `getPromptTemplate(taskId)`
  などを呼べるようにする。
- Cursor側で：
  - 今触っているファイルに関連する SSOT / タスク / プロンプトテンプレートを  
    MCP経由で取得し、コンテキストとして利用。

### 8-2. GitHub連携構想

- GitHub App or PAT を使い、対象リポジトリに自動コミット：
  - `docs/AI_GUIDE.md`
  - `/.cursorrules`
  - `/ssot/*.yml`
- 将来的には：
  - 「タスク生成 → Linear/Plane APIでチケット作成」
  - 「Pull Request テンプレ生成」  
  等も行う。

---

## 9. 今後詰めるポイント（メモ）

1. SSOTスキーマ詳細：
   - 特に 認証/権限・マルチテナント・課金・監査ログ・セキュリティ要件をどうテンプレ化するか。
2. プロンプトテンプレート：
   - `generate_prompts` 用の system / user / 禁則 / 出力形式のテンプレ設計。
3. トークン使用量の実測：
   - 各ワークフロー（Fast/Balanced/Strict）ごとのトークン消費とモデル別コスト。
4. `.cursorrules` / `AI_GUIDE.md` 仕様具体化：
   - SSOTからどう射影するか、ファイル構造・命名規則を標準化する。

---
