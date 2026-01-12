# マーケティング自動化セットアップガイド

**作成日**: 2026-01-03

---

## 🤖 自動化できること

| 機能 | 自動化レベル | 必要な設定 |
|------|-------------|-----------|
| X投稿（予約） | ✅ 完全自動 | X API Keys + GitHub Secrets |
| Zenn記事公開 | ✅ 完全自動 | GitHub連携 |
| 記事公開→X告知 | ✅ 完全自動 | GitHub Actions |
| KPIレポート | ✅ 週次自動 | GitHub Actions |
| note投稿 | ❌ 手動 | （APIなし） |

---

## 1. X API セットアップ

### 1-1. 環境変数の設定（ローカル）

`.env.local` ファイルを作成:

```bash
# .env.local
X_API_KEY=your_api_key
X_API_SECRET=your_api_secret
X_ACCESS_TOKEN=your_access_token
X_ACCESS_SECRET=your_access_secret
```

### 1-2. twitter-api-v2 のインストール

```bash
npm install twitter-api-v2
```

### 1-3. 動作確認

```bash
# 予約一覧を表示
npm run marketing:x:list

# カレンダーから投稿をインポート
npm run marketing:x:import

# 予約一覧を確認
npm run marketing:x:list

# テスト投稿（本番環境では注意）
# npm run marketing:x:post "テスト投稿です"
```

---

## 2. GitHub Secrets の設定

GitHub Actions で自動実行するために、リポジトリの Secrets を設定します。

### 2-1. Secrets の追加

1. GitHub リポジトリ → Settings → Secrets and variables → Actions
2. 以下の Secrets を追加:

| Name | Value |
|------|-------|
| `X_API_KEY` | X Developer Portal の API Key |
| `X_API_SECRET` | X Developer Portal の API Secret |
| `X_ACCESS_TOKEN` | X Developer Portal の Access Token |
| `X_ACCESS_SECRET` | X Developer Portal の Access Token Secret |

### 2-2. ワークフローの確認

`.github/workflows/marketing-automation.yml` が以下を自動実行:

- **Zenn記事公開時**: X に自動告知
- **毎日 12:00/19:00 JST**: 予約投稿を実行
- **毎週日曜 10:00 JST**: KPIレポートを生成

---

## 3. Zenn GitHub連携

### 3-1. Zenn CLI の初期化

```bash
# Zenn CLI をインストール（未インストールの場合）
npm install zenn-cli

# 初期化（既にディレクトリがある場合はスキップ）
npx zenn init
```

### 3-2. GitHub連携の有効化

1. Zenn (https://zenn.dev) にログイン
2. Settings → GitHub連携
3. リポジトリを選択して連携

### 3-3. 記事の公開

```bash
# 記事を編集
vim articles/ssot-introduction.md

# published: true に変更

# プレビュー確認
npm run marketing:zenn:preview

# Git push → Zenn に自動公開
git add articles/
git commit -m "feat(article): 記事公開"
git push
```

---

## 4. コマンド一覧

### X投稿関連

```bash
# 即時投稿
npm run marketing:x:post "投稿内容"

# 予約投稿
npm run marketing:x:schedule "投稿内容" "2026-01-10T12:00:00+09:00"

# 予約一覧
npm run marketing:x:list

# カレンダーからインポート
npm run marketing:x:import

# 予約投稿を実行（通常はGitHub Actionsが自動実行）
npm run marketing:x:process
```

### KPI関連

```bash
# KPIレポート生成
npm run marketing:kpi
```

### Zenn関連

```bash
# プレビュー
npm run marketing:zenn:preview
```

---

## 5. 運用フロー

### 週次ルーティン

```
【月曜】
1. content/x_calendar.json に今週の投稿を追加
2. npm run marketing:x:import でスケジュール登録
3. npm run marketing:x:list で確認

【木曜】
1. Zenn記事の執筆・編集
2. git push で自動公開
3. → GitHub Actions が X に自動告知

【日曜】
1. GitHub Actions が KPIレポートを自動生成
2. docs/reports/kpi_*.md を確認
3. 来週のコンテンツ計画を立てる
```

### コンテンツカレンダーの編集

`content/x_calendar.json` を編集:

```json
[
  {
    "date": "2026-01-20T12:00:00+09:00",
    "type": "build_in_public",
    "content": "投稿内容...\n\n#hashtag",
    "hashtags": ["hashtag"]
  }
]
```

---

## 6. トラブルシューティング

### X API エラー

```
Error: X API credentials not found
```
→ `.env.local` の環境変数を確認

```
Error: twitter-api-v2 not installed
```
→ `npm install twitter-api-v2` を実行

### GitHub Actions が動かない

1. Actions タブでワークフローを確認
2. Secrets が正しく設定されているか確認
3. ワークフローが有効になっているか確認

### Zenn連携が動かない

1. Zenn の GitHub連携設定を確認
2. `published: true` になっているか確認
3. main ブランチに push しているか確認

---

## 7. ファイル構成

```
dev-os-mvp/
├── .github/workflows/
│   └── marketing-automation.yml    # GitHub Actions
├── scripts/marketing/
│   ├── post_to_x.ts                # X投稿スクリプト
│   └── generate_kpi_report.ts      # KPIレポート生成
├── content/
│   ├── x_calendar.json             # コンテンツカレンダー
│   ├── x_schedule.json             # 予約投稿キュー（自動生成）
│   ├── x_posted_log.json           # 投稿ログ（自動生成）
│   └── kpi_history.json            # KPI履歴（自動生成）
├── articles/
│   └── *.md                        # Zenn記事
└── docs/reports/
    └── kpi_*.md                    # 週次KPIレポート（自動生成）
```

---

## 8. 自動化のメリット

| Before（手動） | After（自動化） |
|---------------|----------------|
| 毎日投稿を忘れがち | カレンダーに登録→自動投稿 |
| 記事公開→X告知を忘れる | push→自動告知 |
| KPI集計に時間がかかる | 週次レポート自動生成 |
| 投稿時間がバラバラ | 12:00/19:00 に統一 |

**月あたりの時間削減: 約5-10時間**

---

## 9. 次のステップ

自動化が完了したら:

1. `content/x_calendar.json` に2週間分の投稿を登録
2. `npm run marketing:x:import` でスケジュール登録
3. GitHub Secrets を設定
4. 最初の Zenn 記事を `published: true` にして push

**準備完了！あとは自動で回ります 🚀**

