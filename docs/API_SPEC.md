# IYASAKA dev-OS | API Specification

## 1. 概要
本ドキュメントは、dev-OS Web Console がバックエンド（Hono / Next.js API Routes）と通信するためのエンドポイントを定義します。

## 2. エンドポイント一覧

### 2.1 ワークスペース (Workspaces)
| メソッド | パス | 説明 |
| :--- | :--- | :--- |
| `GET` | `/api/v1/:org/workspaces` | 組織内のワークスペース一覧取得 |
| `POST` | `/api/v1/:org/workspaces` | 新規ワークスペース作成 |
| `GET` | `/api/v1/:org/workspaces/:ws` | ワークスペース詳細（SSOT含む）取得 |

### 2.2 SSOT (Single Source of Truth)
| メソッド | パス | 説明 |
| :--- | :--- | :--- |
| `GET` | `/api/v1/:org/:ws/ssot/:file` | 特定の SSOT ファイル（YAML）の取得 |
| `PATCH` | `/api/v1/:org/:ws/ssot/:file` | SSOT ファイルの更新 |
| `GET` | `/api/v1/:org/:ws/ssot/preview` | SSOT に基づく機能プレビューの生成 |

### 2.3 実行 (Execution)
| メソッド | パス | 説明 |
| :--- | :--- | :--- |
| `POST` | `/api/v1/:org/:ws/plan` | 指定条件に基づく実行プラン（Steps）の生成 |
| `POST` | `/api/v1/:org/:ws/run` | ワークフロー（Drafter/Reviewer等）の実行 |
| `GET` | `/api/v1/:org/:ws/logs` | 実行ログ一覧取得 |
| `GET` | `/api/v1/:org/:ws/logs/:id` | 特定の実行ログ詳細（Halt理由含む）取得 |

### 2.4 設定 & 課金 (Settings & Billing)
| メソッド | パス | 説明 |
| :--- | :--- | :--- |
| `GET` | `/api/v1/:org/billing/plan` | 現在のプランとクレジット情報の取得 |
| `POST` | `/api/v1/:org/billing/checkout` | Stripe 決済セッションの作成 |
| `POST` | `/api/v1/:org/billing/portal` | Stripe Customer Portal への遷移 URL 取得 |
| `GET` | `/api/v1/:org/api-keys` | 登録済み BYO APIキー一覧（マスク済み） |
| `POST` | `/api/v1/:org/api-keys` | 新しい API キーの暗号化保存 |

### 2.5 認証・オンボーディング (Auth & Onboarding)
| メソッド | パス | 説明 |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/webhook` | Supabase からのサインアップ通知受信（ユーザー同期） |
| `POST` | `/api/v1/auth/onboard` | 初期組織・ワークスペースの作成実行 |
| `GET` | `/api/v1/me` | 現在のユーザー情報と所属組織一覧の取得 |

## 3. 共通データ形式

### 3.1 エラーレスポンス
IYASAKA のガバナンスおよび利用制限に基づき、停止（Halt）や制限（Limit）時は以下の形式で返却します。

#### ① ガバナンスによる停止 (Halt)
```json
{
  "status": "halted",
  "trigger_id": "GOV-001",
  "reason": "設計の境界違反を検知しました",
  "details": "ssot/features.yml の 'auth' 機能に未定義の依存関係が含まれています。",
  "suggestions": [
    "SSOT に依存関係を追記してください",
    "または、実装の範囲を修正してください"
  ]
}
```

#### ② 利用制限による停止 (Limit Reached)
```json
{
  "status": "limit_reached",
  "limit_type": "monthly_executions",
  "current_usage": 10,
  "max_limit": 10,
  "reason": "無料プランの月間実行制限に達しました",
  "upgrade_url": "/settings/:org/billing"
}
```

## 4. 特殊なロジック仕様

### 4.1 実行数カウント (Usage Aggregation)
*   **対象:** `execution_log`
*   **条件:** `organization_id` 一致 AND `created_at` が今月初〜現在
*   **タイミング:** `/api/v1/:org/:ws/run` 実行の直前に判定

### 4.2 シート数計算 (Seat Calculation)
*   **対象:** `organization_member`
*   **条件:** `organization_id` 一致 AND `role` != 'viewer'
*   **Stripe 同期:** メンバーの追加・削除時に Stripe Subscription Item の `quantity` を更新する

## 5. 認証・認可
*   **Authentication:** Supabase Auth (JWT) をリクエストヘッダーに付与。
*   **Authorization:** `organization_member` テーブルに基づき、`role` に応じたアクセス制御を実施。



