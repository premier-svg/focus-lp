// ===========================
// ガテン採用 フォームハンドラー (Google Apps Script)
// ===========================
// デプロイ: ウェブアプリとして公開
//   実行ユーザー: 自分
//   アクセス: 全員（匿名含む）
//
// スクリプトプロパティ（任意）:
//   NOTION_API_KEY - Notion Integration Token
//   NOTION_DB_ID   - Notion データベースID
// ===========================

var SPREADSHEET_ID = '10CpzCgDgLBIWNtU0cI0_xZIpKy_D3W0jZI2LSd9eD2o';
var DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1487858489152770069/agns6VG3hiOj-gHs8ODOT91sUijeOJzXo0E9JtJUFb1M3eojq9lztGxTfZLv8BKF2JQ9';

// --- 設定値の取得 ---
function getConfig() {
  var props = PropertiesService.getScriptProperties();
  return {
    NOTION_API_KEY: props.getProperty('NOTION_API_KEY') || '',
    NOTION_DB_ID:   props.getProperty('NOTION_DB_ID') || ''
  };
}

// --- メインハンドラー: POST ---
function doPost(e) {
  try {
    // e.parameter で受信（application/x-www-form-urlencoded 対応）
    var company = (e.parameter && e.parameter.company) ? e.parameter.company : '';
    var name    = (e.parameter && e.parameter.name)    ? e.parameter.name    : '';
    var email   = (e.parameter && e.parameter.email)   ? e.parameter.email   : '';
    var phone   = (e.parameter && e.parameter.phone)   ? e.parameter.phone   : '';

    // バリデーション
    if (!company || !name || !email) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: '必須項目が未入力です' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var now = new Date();
    var jst = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');

    // ① Googleスプレッドシートに追記（最優先・失敗しにくい）
    appendToSheet(company, name, email, phone);

    // ② Notion DBに登録（失敗してもスプシがあるので続行）
    try {
      var config = getConfig();
      if (config.NOTION_API_KEY && config.NOTION_DB_ID) {
        createNotionPage(config, {
          company: company,
          name: name,
          email: email,
          phone: phone,
          timestamp: now.toISOString()
        });
      }
    } catch (notionError) {
      Logger.log('Notion登録失敗（続行）: ' + notionError.toString());
    }

    // ③ 自動返信メール送信
    try {
      sendAutoReplyEmail({ company: company, name: name, email: email });
    } catch (mailError) {
      Logger.log('メール送信失敗（続行）: ' + mailError.toString());
    }

    // ④ Discord Webhook通知
    try {
      sendDiscordNotification({ company: company, name: name, email: email, phone: phone, jst: jst });
    } catch (discordError) {
      Logger.log('Discord通知失敗（続行）: ' + discordError.toString());
    }

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success', success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('doPost Error: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --- doGet（テスト・疎通確認用） ---
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'GAS is running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- ① Googleスプレッドシート追記 ---
function appendToSheet(company, name, email, phone) {
  var jst = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  SpreadsheetApp.openById(SPREADSHEET_ID)
    .getActiveSheet()
    .appendRow([jst, company, name, email, phone, '未対応']);
  Logger.log('Spreadsheet row appended');
}

// --- ② Notion登録 ---
function createNotionPage(config, data) {
  var url = 'https://api.notion.com/v1/pages';

  var payload = {
    parent: { database_id: config.NOTION_DB_ID },
    properties: {
      '会社名': {
        title: [{ text: { content: data.company } }]
      },
      '氏名': {
        rich_text: [{ text: { content: data.name } }]
      },
      'メール': {
        email: data.email
      },
      '電話番号': {
        phone_number: data.phone || ''
      },
      'ステータス': {
        select: { name: '新規リード' }
      },
      '流入元': {
        select: { name: 'ガテン採用LP' }
      },
      '登録日時': {
        date: { start: data.timestamp }
      }
    }
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + config.NOTION_API_KEY,
      'Notion-Version': '2022-06-28'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var result = JSON.parse(response.getContentText());

  if (response.getResponseCode() !== 200) {
    Logger.log('Notion error: ' + JSON.stringify(result));
    throw new Error('Notion登録に失敗: ' + (result.message || 'unknown'));
  }

  Logger.log('Notion page created: ' + result.id);
  return result;
}

// --- ③ 自動返信メール ---
function sendAutoReplyEmail(data) {
  var subject = '【ガテン採用】資料ダウンロードのご案内';

  var body =
    data.name + ' 様\n\n' +
    'この度は「ガテン採用」の資料をご請求いただき、\n' +
    '誠にありがとうございます。\n\n' +
    '資料は追ってお送りいたします。\n' +
    '今しばらくお待ちくださいませ。\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n' +
    '【ご請求内容】\n' +
    '会社名: ' + data.company + '\n' +
    'お名前: ' + data.name + '\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    '資料では以下の内容をご確認いただけます：\n' +
    '・ガテン採用の採用支援の仕組み\n' +
    '・導入企業の成功事例（応募数5倍の実績）\n' +
    '・料金プラン・サービス詳細\n' +
    '・採用成功チェックリスト\n\n' +
    'ご不明点がございましたら、\n' +
    'お気軽にご返信ください。\n\n' +
    '─────────────────\n' +
    'ガテン職プラットフォーム\n' +
    '株式会社プライマー\n' +
    '─────────────────';

  GmailApp.sendEmail(data.email, subject, body, {
    name: 'ガテン職プラットフォーム'
  });

  Logger.log('Auto-reply sent to: ' + data.email);
}

// --- ④ Discord Webhook通知 ---
function sendDiscordNotification(data) {
  var payload = {
    embeds: [{
      title: '\uD83D\uDD14 新規リード',
      color: 16738560,
      fields: [
        { name: '会社名',   value: data.company,        inline: true },
        { name: '氏名',     value: data.name,            inline: true },
        { name: 'メール',   value: data.email,           inline: false },
        { name: '電話番号', value: data.phone || '未入力', inline: true },
        { name: '受信日時', value: data.jst,              inline: true }
      ],
      footer: {
        text: 'ガテン採用LP | Notionリード管理DBに自動登録済み'
      },
      timestamp: new Date().toISOString()
    }]
  };

  UrlFetchApp.fetch(DISCORD_WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  Logger.log('Discord notification sent');
}

// --- テスト用 ---
function testDoPost() {
  var mockEvent = {
    parameter: {
      company: 'テスト建設株式会社',
      name: 'テスト太郎',
      email: 'test@example.com',
      phone: '03-1234-5678'
    }
  };

  var result = doPost(mockEvent);
  Logger.log(result.getContent());
}
