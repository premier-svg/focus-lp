/**
 * FocusLP フォーム送信受信スクリプト
 *
 * デプロイ手順:
 * 1. https://script.google.com/ で新規プロジェクト作成
 * 2. このコードを貼り付け
 * 3. SPREADSHEET_ID を実際のスプレッドシートIDに変更
 * 4. デプロイ → 新しいデプロイ → ウェブアプリ
 *    - 実行者: 自分
 *    - アクセス: 全員
 * 5. 生成されたURLをLP HTMLの GAS_URL に設定
 */

const SPREADSHEET_ID = '1vPAw9BvdlN5f-jR63j57ysEhEhdMvPMJQsGF3ww5qu4';
const SHEET_NAME = 'LP問い合わせ';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        'タイムスタンプ',
        '会社名',
        '代表者名',
        '役職',
        'メール',
        '電話番号',
        '業種',
        '送信日時(クライアント)'
      ]);
    }

    sheet.appendRow([
      new Date(),
      data.company || '',
      data.name || '',
      data.title || '',
      data.email || '',
      data.phone || '',
      data.industry || '',
      data.submitted_at || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'FocusLP GAS endpoint is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}
