/**
 * Visority '26 Registration Webhook — Google Apps Script
 *
 * HOW TO DEPLOY
 * ─────────────
 * 1. Create a blank Google Sheet (or use your existing one).
 * 2. Click  Extensions ▸ Apps Script  (opens the script editor).
 * 3. Replace all default code with this script.
 * 4. Click  Deploy  ▸  New deployment  ▸  Web app
 *      - Description: "Visority '26 Registration Webhook"
 *      - Execute as:   Me
 *      - Who has access: Anyone
 * 5. Click  Deploy  and copy the Web app URL.
 * 6. Paste the URL into index.html:
 *      const GOOGLE_SHEETS_WEBHOOK_URL = 'https://script.google.com/macros/s/YOUR_DEPLOY_ID/exec';
 *
 * ──────────────────────────────────────────────────────────
 * Column Mapping (Sheet columns A → I)
 * ──────────────────────────────────────────────────────────
 * A: Submitted At
 * B: Full Name
 * C: Email
 * D: Role
 * E: WhatsApp
 * F: Core Challenge
 * G: Desired Experience
 * H: Custom Note
 * I: Selected Tier
 * ──────────────────────────────────────────────────────────
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);

    sheet.appendRow([
      data.submittedAt || new Date().toISOString(),
      data.fullName      || '',
      data.email         || '',
      data.role          || '',
      data.whatsApp      || '',
      data.coreChallenge || '',
      data.desiredExperience || '',
      data.customNote    || '',
      data.selectedTier  || 'standard'
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
