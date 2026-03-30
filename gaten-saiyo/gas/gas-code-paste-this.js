// 実際のキーはGASエディタ内で直接設定（このファイルはGitHub用のテンプレート）
var NOTION_API_KEY='YOUR_NOTION_API_KEY';
var NOTION_DB_ID='YOUR_NOTION_DB_ID';
var DISCORD_WEBHOOK_URL='YOUR_DISCORD_WEBHOOK_URL';

function doPost(e) {
  try {
    var params = {};
    if (e.parameter && e.parameter.company) {
      params = e.parameter;
    } else if (e.postData && e.postData.contents) {
      var raw = e.postData.contents;
      if ((e.postData.type || '').indexOf('json') !== -1) {
        params = JSON.parse(raw);
      } else {
        var pairs = raw.split('&');
        for (var i = 0; i < pairs.length; i++) {
          var kv = pairs[i].split('=');
          params[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' '));
        }
      }
    }
    var company = params.company || '';
    var name = params.name || '';
    var email = params.email || '';
    var phone = params.phone || '';
    if (!company || !name || !email) {
      return ContentService.createTextOutput(JSON.stringify({success: false})).setMimeType(ContentService.MimeType.JSON);
    }
    var now = new Date();
    var jst = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd HH:mm');
    appendToSheet(company, name, email, phone);
    try { createNotionPage({company: company, name: name, email: email, phone: phone, timestamp: now.toISOString()}); } catch(err) { Logger.log('Notion: ' + err); }
    try { sendAutoReplyEmail({company: company, name: name, email: email}); } catch(err) { Logger.log('Mail: ' + err); }
    try { sendDiscordNotification({company: company, name: name, email: email, phone: phone, jst: jst}); } catch(err) { Logger.log('Discord: ' + err); }
    return ContentService.createTextOutput(JSON.stringify({result: 'success', success: true})).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error: ' + error);
    return ContentService.createTextOutput(JSON.stringify({result: 'error', success: false})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({status: 'ok'})).setMimeType(ContentService.MimeType.JSON);
}

function appendToSheet(company, name, email, phone) {
  var jst = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  SpreadsheetApp.openById('1Qgb9KfdfXI0GE-vTlUeHPvJ5Ox772t3akCniJ7NRWC8').getSheets()[0].appendRow([jst, company, name, email, phone, '未対応']);
}

function createNotionPage(data) {
  var resp = UrlFetchApp.fetch('https://api.notion.com/v1/pages', {
    method: 'post',
    contentType: 'application/json',
    headers: {'Authorization': 'Bearer ' + NOTION_API_KEY, 'Notion-Version': '2022-06-28'},
    payload: JSON.stringify({
      parent: {database_id: NOTION_DB_ID},
      properties: {
        '会社名': {title: [{text: {content: data.company}}]},
        '氏名': {rich_text: [{text: {content: data.name}}]},
        'メールアドレス': {email: data.email},
        '電話番号': {phone_number: data.phone || ''},
        '受信日時': {date: {start: data.timestamp}},
        'ステータス': {select: {name: '新規'}},
        'ソース': {rich_text: [{text: {content: 'LP'}}]}
      }
    }),
    muteHttpExceptions: true
  });
  if (resp.getResponseCode() !== 200) { throw new Error('Notion error'); }
  Logger.log('Notion OK');
}

function sendAutoReplyEmail(data) {
  var body = data.name + ' 様\n\n';
  body += 'この度は「ガテン採用」の資料をご請求いただき、誠にありがとうございます。\n\n';
  body += '資料は追ってお送りいたします。今しばらくお待ちくださいませ。\n\n';
  body += '会社名: ' + data.company + '\n';
  body += 'お名前: ' + data.name + '\n\n';
  body += 'ガテン職プラットフォーム / 株式会社プライマー';
  GmailApp.sendEmail(data.email, '【ガテン採用】資料ダウンロードのご案内', body, {name: 'ガテン職プラットフォーム'});
}

function sendDiscordNotification(data) {
  UrlFetchApp.fetch(DISCORD_WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      embeds: [{
        title: '新規リード',
        color: 16738560,
        fields: [
          {name: '会社名', value: data.company, inline: true},
          {name: '氏名', value: data.name, inline: true},
          {name: 'メール', value: data.email, inline: false},
          {name: '電話番号', value: data.phone || '未入力', inline: true},
          {name: '受信日時', value: data.jst, inline: true}
        ]
      }]
    }),
    muteHttpExceptions: true
  });
}

function testDoPost() {
  var r = doPost({parameter: {company: 'テスト建設', name: 'テスト太郎', email: 'test@example.com', phone: '03-1234-5678'}});
  Logger.log(r.getContent());
}
