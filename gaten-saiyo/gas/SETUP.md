# GAS フォームハンドラー セットアップ手順

## 1. Google Apps Script プロジェクト作成

1. https://script.google.com で新規プロジェクト作成
2. `form-handler.gs` の内容を貼り付け
3. プロジェクト名: `ガテン採用フォーム`

## 2. スクリプトプロパティ設定

プロジェクト設定 → スクリプトプロパティに以下を追加:

| キー | 値 | 説明 |
|------|-----|------|
| `NOTION_API_KEY` | `ntn_xxxx...` | Notion Integration Token |
| `NOTION_DB_ID` | `xxxxx-xxxxx...` | NotionリードDBのID |
| `SLACK_WEBHOOK_URL` | `https://hooks.slack.com/...` | Slack Incoming Webhook |
| `NOTIFY_EMAIL` | `taiga@example.com` | たいが宛通知メール |
| `PDF_URL` | `https://...guide.pdf` | 資料PDFのURL |

## 3. Notion データベース準備

以下のプロパティでDBを作成:

| プロパティ名 | タイプ |
|-------------|--------|
| 会社名 | Title |
| 氏名 | Rich text |
| メール | Email |
| 電話番号 | Phone |
| ステータス | Select (新規リード / フォロー中 / 商談中 / 成約 / 失注) |
| 流入元 | Select (ガテン採用LP / ドラ採用LP / ...) |
| 登録日時 | Date |

Notion Integration にDBへのアクセス権を付与すること。

## 4. デプロイ

1. デプロイ → 新しいデプロイ → ウェブアプリ
2. 実行ユーザー: **自分**
3. アクセス: **全員**
4. デプロイ → URL をコピー
5. `index.html` の `GAS_ENDPOINT` を取得したURLに差し替え

## 5. テスト

1. GASエディタで `testDoPost` を実行してNotion登録・メール送信を確認
2. LP のフォームからテスト送信
3. 確認項目:
   - [ ] Notionに登録されるか
   - [ ] 自動返信メールが届くか
   - [ ] Slack通知が来るか
   - [ ] メール通知が来るか

## 6. Slack Webhook 設定

1. https://api.slack.com/apps → Create New App
2. Incoming Webhooks → Activate
3. Add New Webhook to Workspace → チャンネル選択
4. Webhook URL をスクリプトプロパティに設定
