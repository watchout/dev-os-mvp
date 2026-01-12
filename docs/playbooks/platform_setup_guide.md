# マーケティングプラットフォーム セットアップガイド

**パターンA: 最小コスト運用**

| プラットフォーム | 方法 | コスト |
|-----------------|------|--------|
| X（Twitter） | Free API + 手動 | $0 |
| Zenn | GitHub連携 | $0 |
| note | 手動投稿 | $0 |

---

## 1. X（Twitter）Free API セットアップ

### 1-1. 開発者アカウント登録

1. **X Developer Portal にアクセス**
   - https://developer.twitter.com/

2. **Sign up for Free Account をクリック**

3. **利用目的を記入**（英語）
   ```
   I am building a developer tool called "dev-OS" that helps 
   software engineers manage AI-assisted development workflows.
   I will use the API to:
   - Post updates about product development (Build in Public)
   - Share technical tips and articles
   - Engage with the developer community
   ```

4. **規約に同意して登録完了**

### 1-2. App 作成

1. **Developer Portal → Projects & Apps → Create App**

2. **App 名を設定**
   ```
   dev-os-marketing
   ```

3. **App permissions を設定**
   - Read and Write（読み書き両方）

4. **Keys and tokens を生成**
   - API Key
   - API Key Secret
   - Access Token
   - Access Token Secret
   
   → **必ずメモしておく**（一度しか表示されない）

### 1-3. 環境変数の設定

プロジェクトルートに `.env.local` を作成：

```bash
# .env.local（.gitignore に追加済みであること確認）
X_API_KEY=your_api_key
X_API_SECRET=your_api_secret
X_ACCESS_TOKEN=your_access_token
X_ACCESS_SECRET=your_access_secret
```

### 1-4. Free プランの制限

| 項目 | 制限 |
|------|------|
| 投稿数 | 1,500/月（約50/日） |
| 読み取り | 制限あり |
| アプリ数 | 1 |

**マーケティング用途なら十分！**
- 1日3投稿 × 30日 = 90投稿/月
- バッファを持っても余裕あり

### 1-5. 投稿スクリプト（オプション）

`scripts/post_to_x.ts` を後ほど作成します。
ただし、初期は手動投稿でも問題ありません。

---

## 2. Zenn GitHub連携 セットアップ

### 2-1. Zenn アカウント作成

1. https://zenn.dev にアクセス
2. GitHubアカウントでログイン
3. プロフィール設定

### 2-2. Zenn CLI インストール

```bash
# プロジェクトルートで実行
npm install zenn-cli

# 初期化
npx zenn init
```

これにより以下が作成されます：
```
/articles/     # 記事を格納
/books/        # 本を格納（任意）
```

### 2-3. リポジトリ構造

```
dev-os-mvp/
├── articles/                    # Zenn記事
│   ├── ssot-introduction.md     # 記事1
│   ├── ai-dev-quality.md        # 記事2
│   └── cursor-devos.md          # 記事3
├── ...
```

### 2-4. 記事のフォーマット

```markdown
---
title: "SSOTとは何か - AI時代の仕様管理の新常識"
emoji: "📋"
type: "tech"
topics: ["ssot", "ai", "cursor", "開発効率化"]
published: true
---

## はじめに

（本文）
```

### 2-5. GitHub連携の有効化

1. **Zenn → Settings → GitHub連携**
2. **リポジトリを選択**（dev-os-mvp または専用リポジトリ）
3. **連携を有効化**

### 2-6. 記事の公開フロー

```bash
# 1. 新規記事作成
npx zenn new:article --slug my-article-slug

# 2. 記事を編集
# articles/my-article-slug.md を編集

# 3. プレビュー
npx zenn preview

# 4. 公開
git add articles/my-article-slug.md
git commit -m "feat(article): SSOTとは何か"
git push origin main

# → 自動的にZennに公開される
```

### 2-7. 推奨ワークフロー

```
1. ローカルで Markdown 執筆
2. `npx zenn preview` でプレビュー確認
3. Git commit & push
4. Zenn に自動公開
5. X で告知投稿
```

---

## 3. note 運用（手動投稿）

### 3-1. note アカウント作成

1. https://note.com にアクセス
2. アカウント作成
3. プロフィール設定
   - プロフィール画像
   - 自己紹介文
   - リンク（LP URL）

### 3-2. 投稿フロー

```
1. ローカルで Markdown 執筆
2. note のエディタに貼り付け
3. 画像をアップロード
4. プレビュー確認
5. 公開
6. X で告知投稿
```

### 3-3. Markdown → note 変換の注意点

| Markdown | note での対応 |
|----------|--------------|
| `# 見出し` | H2として表示 |
| `## 見出し` | H3として表示 |
| コードブロック | そのまま使える |
| 画像 | 手動でアップロード |
| リンク | そのまま使える |

### 3-4. 推奨記事構造（note向け）

```markdown
【導入】読者の興味を引くフック（2-3行）

---

## 目次
1. 〇〇とは
2. なぜ〇〇が必要か
3. 具体的な方法
4. まとめ

---

## 1. 〇〇とは

（本文）

---

## まとめ

（まとめ）

---

📌 **dev-OS について**
AI開発の品質を劇的に向上させる開発OS。
無料で試せます → https://dev-os.iyasaka.co.jp
```

---

## 4. コンテンツ管理ワークフロー

### 4-1. ディレクトリ構造

```
dev-os-mvp/
├── articles/                    # Zenn記事（GitHub連携）
│   ├── ssot-introduction.md
│   └── cursor-devos.md
├── content/                     # note用下書き（手動投稿）
│   ├── drafts/
│   │   └── ai-dev-failure.md
│   └── published/
│       └── ai-dev-failure.md
├── docs/
│   └── playbooks/
│       ├── marketing_playbook.md
│       ├── content_calendar_month1.md
│       └── kpi_tracking_sheet.md
└── scripts/
    └── post_to_x.ts             # X投稿スクリプト（オプション）
```

### 4-2. 週次ルーティン

| 曜日 | タスク |
|------|--------|
| 月 | 今週のX投稿内容確認・準備 |
| 火 | 記事執筆（1時間） |
| 水 | 記事執筆続き |
| 木 | 記事レビュー・公開 |
| 金 | X投稿振り返り、来週準備 |
| 土 | 週次KPI確認 |
| 日 | 休み or バッファ |

### 4-3. 記事公開チェックリスト

```markdown
## 公開前チェックリスト

### 内容
- [ ] タイトルは魅力的か？
- [ ] 導入で読者の興味を引けているか？
- [ ] 構成は分かりやすいか？
- [ ] 誤字脱字はないか？
- [ ] リンクは正しいか？

### SEO
- [ ] キーワードが含まれているか？
- [ ] メタ情報（Zennのtopics等）は適切か？

### ビジュアル
- [ ] OGP画像は用意したか？
- [ ] スクリーンショットは見やすいか？

### CTA
- [ ] dev-OSへの導線があるか？
- [ ] utm_campaignパラメータは正しいか？

### 公開後
- [ ] Xで告知投稿したか？
- [ ] 他のSNSでシェアしたか？
```

---

## 5. X投稿の効率化

### 5-1. 投稿テンプレート準備

よく使う投稿パターンをテンプレート化：

```
/content/x_templates/

├── build_in_public.md
│   "今日追加した機能 📝
│   
│   [機能説明]
│   
│   #dev-OS #AI開発"

├── tips.md
│   "Cursor Tips 💡
│   
│   [Tip内容]
│   
│   #Cursor #Tips"

├── buzz.md
│   "[キャッチーな問いかけ]
│   
│   [課題の説明]
│   
│   [解決策のヒント]
│   
│   #AI開発 #Cursor"

└── article_announce.md
│   "記事を書きました ✍️
│   
│   [記事タイトル]
│   
│   [記事の要約]
│   
│   [URL]
│   
│   #Zenn #AI開発"
```

### 5-2. 予約投稿ツール（無料オプション）

| ツール | 無料枠 | 特徴 |
|--------|--------|------|
| **TweetDeck** | 無制限 | X公式、予約投稿可能 |
| **Buffer** | 3投稿/チャンネル | 複数SNS対応 |
| **Typefully** | 1スレッド/日 | スレッド作成に特化 |

**推奨**: TweetDeck（X Pro）で予約投稿

---

## 6. セットアップ完了チェックリスト

### X（Twitter）
- [ ] Developer Portal でアカウント作成
- [ ] App 作成・API Keys 取得
- [ ] `.env.local` に環境変数設定
- [ ] テスト投稿成功

### Zenn
- [ ] Zenn アカウント作成
- [ ] `npx zenn init` 実行
- [ ] GitHub連携有効化
- [ ] テスト記事公開成功

### note
- [ ] note アカウント作成
- [ ] プロフィール設定
- [ ] テスト記事投稿成功

### 運用準備
- [ ] `/content/` ディレクトリ作成
- [ ] X投稿テンプレート準備
- [ ] 初月コンテンツカレンダー確認
- [ ] KPI追跡シート準備

---

**セットアップが完了したら、コンテンツカレンダーに沿って運用開始！**

