/**
 * Visority '26 Registration Webhook — Google Apps Script (Optimized)
 *
 * HOW TO UPDATE YOUR DEPLOYMENT
 * ──────────────────────────────
 * 1. In your Google Sheet, click Extensions ▸ Apps Script.
 * 2. Replace all code in Code.gs with this script.
 * 3. Ensure Row 1 of Sheet1 has these exact column headers:
 *    [Timestamp | Full Name | Email | Role | WhatsApp | Core Challenge | Desired Experience | Note | Tier]
 * 4. Click Deploy ▸ Manage deployments.
 * 5. Click the edit (pencil) icon next to your active Web App deployment.
 * 6. Under "Version", select "New version".
 * 7. Ensure "Who has access" is set to "Anyone".
 * 8. Click Deploy.
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
    var data = {};

    // 1. Try parsing JSON body from postData
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        // Fallback to URL parameters if JSON parsing fails
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }

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
