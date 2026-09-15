/**
 * Visority '26 — Registration Webhook (Standard + VIP)
 *
 * Receives registration + checkout submissions and appends them
 * to the active tab of this spreadsheet.
 *
 * NOTE: Partnership leads use a separate dedicated webhook
 * (see PARTNER_SHEETS_WEBHOOK_URL in index.html).
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var data = {};

    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    sheet.appendRow([
      data.submittedAt || new Date().toISOString(),
      data.fullName || '',
      data.email || '',
      data.role || '',
      data.whatsApp || '',
      data.coreChallenge || '',
      data.desiredExperience || '',
      data.customNote || '',
      data.selectedTier || 'standard'
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput("Visority '26 Webhook Active")
    .setMimeType(ContentService.MimeType.TEXT);
}