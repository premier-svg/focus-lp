# focus-lp - FOCUS45° LP制作

FRUOR株式会社「FOCUS45°」の業種別ランディングページ。

## ディレクトリ構造

```
focus-lp/
├── construction/    # 建設業向けLP
│   └── index.html
├── logistics/       # 運送業向けLP
│   └── index.html
└── README.md
```

## ローカルプレビュー

```bash
cd ~/focus-lp
python3 -m http.server 8000
```

- 建設業LP: http://localhost:8000/construction/
- 運送業LP: http://localhost:8000/logistics/

## GitHub Pagesデプロイ手順

### 1. gh CLI インストール

```bash
brew install gh && gh auth login
```

### 2. リポジトリ作成 & プッシュ

```bash
cd ~/focus-lp
git init
git add .
git commit -m "feat: 建設業・運送業向けLP初版"
gh repo create focus-lp --public --source=. --push
```

### 3. GitHub Pages 有効化

1. GitHubリポジトリページ → Settings → Pages
2. Source: `Deploy from a branch`
3. Branch: `main` / `/ (root)`
4. Save

### 4. 公開URL（{username} を自分のGitHubユーザー名に置換）

- 建設業LP: `https://{username}.github.io/focus-lp/construction/`
- 運送業LP: `https://{username}.github.io/focus-lp/logistics/`

## フォーム送信先の設定

お問い合わせフォームはGoogle Apps Script経由でGoogleスプレッドシートに記録します。

### GAS設定手順

1. Google スプレッドシートを新規作成
2. 拡張機能 → Apps Script を開く
3. 以下のコードを貼り付けてデプロイ:

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);
  sheet.appendRow([
    data.submitted_at,
    data.industry,
    data.company,
    data.name,
    data.title,
    data.email,
    data.phone
  ]);
  return ContentService.createTextOutput('OK');
}
```

4. デプロイ → 新しいデプロイ → ウェブアプリ → 全員アクセス可 → デプロイ
5. 発行されたURLを両LP（construction/index.html, logistics/index.html）の `GAS_URL` 変数に設定

## 技術仕様

- TailwindCSS (CDN)
- Google Fonts: Noto Sans JP
- 1ファイル完結（HTML + インラインJS）
- スマホファースト・レスポンシブデザイン
- 配色: 濃紺(#1a237e) / オレンジ(#ff6d00)
