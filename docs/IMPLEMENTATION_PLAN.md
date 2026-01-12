# IYASAKA dev-OS | 統合実装計画 (Grand Roadmap v2.0)

## 1. 目的
`docs/FINAL_VISION.md` で定義された「脱・バイブス」と「売れる設計」を具現化するため、マーケティング・ブランド・技術を三位一体で実装する。

## 2. マイルストーン（確信への階段）

### 🟦 Phase 1: Foundation & Discovery (知恵の深掘り基盤)
**目標:** すでに存在する基盤を整理し、ユーザーが登録後、即座に「確信」を得られる「Discovery Session」の準備を整える。

#### ✅ 完了済み（既に実装）
- [x] **BYO APIキー暗号化基盤**: AES-256-GCM による安全なキー管理（`lib/encryption.ts`）
- [x] **実行ログ保存エンジン**: 実行結果の DB 保存（`ExecutionLog` / `workflow-engine.ts`）
- [x] **脱・バイブスガバナンス (Halt Protocol)**: Reviewer による停止判定と UI 表示
- [x] **組織・メンバー管理**: メンバー招待・ロール管理機能（`MemberManager.tsx`）
- [x] **ワークスペース・コクピット**: 基本的なプロジェクト管理 UI
- [x] **SSOT 管理基盤**: SSOT の編集・差分・バリデーション機能

#### 🔵 次に実装すべき（優先順位順）
1.  **プラン制限エンジン (PLG の生命線)**:
    - [x] `execution_log` に基づく月間実行数カウント（Free: 10回/月制限）
    - [x] 制限到達時のガードレール表示とアップグレード誘導
2.  **オンボーディングフロー (AHA Moment への導線)**:
    - [x] Supabase Auth 連携と、登録直後の Discovery Session への強制誘導
    - [x] 1クリックでの「現場系SSOT（雛形）」展開機能
3.  **Discovery UI (3極の思考可視化)**:
    - [x] Market Analyst / Strategy Designer / Brand Guardian の思考プロセスを可視化するダッシュボード
    - [x] 対話を通じて `personas.yml` / `value_proposition.yml` を生成するフロー
4.  **LP v2.1 最終化**:
    - [x] 「バイブコーディングの限界」訴求の完成とデモ動画枠の設置
5.  **コンテンツ生成エンジン (Build in Public)**:
    - [x] 開発過程（SSOT更新）から X/Note/Zenn 投稿案を自動生成する機能

### 🟧 Phase 2: SaaS Platform & Governance (規律の強制)
**目標:** 「バイブス開発」を自動的に止める高度なガバナンスを実装し、SaaS としての完成度を高める。

#### ✅ 完了済み
1.  **「確信レベル（Confidence Level）」エンジンの実装**:
    - [x] 指示の曖昧さを 3 段階でスコアリングする判定ロジック（`lib/confidence-level.ts`）
    - [x] 改善ヒントの生成（governance.yml 連携）
    - [x] **ミエル化**: UI でのプログレスバーとヒント表示（`ConfidenceMeter.tsx`）
    - [x] ワークフロー実行モーダルへの組み込み（Level 1 で実行ブロック）
2.  **集客ループの自動化**:
    - [x] `generate_content.ts` の cron / GitHub Actions による定時実行設定（`.github/workflows/marketing-content.yml`）
    - [x] `ssot/content_schedule.yml` との完全連動

#### 🔵 次に実装すべき
1.  **マルチテナント・データ境界の確立**:
    - [ ] Prisma スキーマの完全適用（`organization_id` による RLS 前提のクエリ徹底）
2.  **確信レベル強化（Phase 2.5）**:
    - [ ] Before/After 比較の可視化 UI
    - [ ] Reviewer 実行後の `confidenceLevel` を結果表示に反映
    - [ ] NLP ベースの高度な判定ロジック（将来検討）

### 🟩 Phase 3: Monetization & Reliability (課金 & アルファ開始)
**目標:** 課金連携を実装し、実際のビジネス運用を開始する。

1.  **Stripe 課金連携**:
    - [ ] Pro / Team プランの Checkout セッション実装
    - [ ] シートライセンス（従量課金）の Stripe 同和
    - [ ] カスタマーポータル連携
2.  **LTV 最大化ロジック**:
    - [ ] 継続利用を促す「知恵の蓄積レポート」の自動配信
3.  **クローズドアルファ開始**:
    - [ ] 特定ユーザーへの招待、フィードバックループの確立

### 🚀 Phase 4: Expansion & Ecosystem
**目標:** 開発フローの自動化と IDE への深い統合。

- [ ] **Git 連携自動化**: GitHub App 連携による SSOT/Guide の自動プッシュ
- [ ] **タスク管理連携**: Linear / Plane API との双方向同期
- [ ] **MCP サーバ化**: Cursor から SSOT をコンテキストとして参照可能に

---

## 3. 開発の規律
1.  **Vision-Check**: 全ての追加機能は `docs/FINAL_VISION.md` の「確信」に寄与するか？
2.  **Experts-Review**: 設計変更時は、Iza(Analyst), Nami(Designer), Sun(Guardian) の視点で多重監査したか？
3.  **SSOT-First**: コードを書く前に、必ず正本（SSOT）を更新したか？
4.  **ナラティブ・チェック**: UI 文言や機能優先度が「不を光へ」の思想に沿っているか確認する。
