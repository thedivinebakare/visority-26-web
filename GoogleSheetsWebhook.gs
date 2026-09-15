/**
 * Visority '26 Registration Webhook — Google Apps Script (Optimized)
 *
 * HOW TO UPDATE YOUR DEPLOYMENT
 * ──────────────────────────────
 * 1. In your Google Sheet, click Extensions ▸ Apps Script.
 * 2. Replace all code in Code.gs with this script.
 * 3. Ensure Row 1 of the main sheet tab has these exact column headers:
 *    [Timestamp | Full Name | Email | Role | WhatsApp | Core Challenge | Desired Experience | Note | Tier]
 * 4. Click Deploy ▸ Manage deployments.
 * 5. Click the edit (pencil) icon next to your active Web App deployment.
 * 6. Under "Version", select "New version".
 * 7. Ensure "Who has access" is set to "Anyone".
 * 8. Click Deploy.
 *
 * ROUTING
 * ───────
 * Submissions carrying source="partnership_modal" (or sheetTab="Partnerships")
 * are appended to a dedicated "Partnerships" worksheet (created automatically
 * if missing) using these headers:
 *    [Timestamp | Organization | Partnership Type | Community Size | Contact (Email/WhatsApp) | Proposed Note | Source]
 * All other submissions go to the main registration sheet tab.
 *
 * ──────────────────────────────────────────────────────────
 * Main Sheet Column Mapping (Sheet columns A → I)
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
 * Partnerships Sheet Column Mapping (Sheet columns A → G)
 * ──────────────────────────────────────────────────────────
 * A: Timestamp
 * B: Organization
 * C: Partnership Type
 * D: Community Size
 * E: Contact (Email/WhatsApp)
 * F: Proposed Note
 * G: Source
 * ──────────────────────────────────────────────────────────
 */

var PARTNERSHIP_HEADERS = [
  'Timestamp',
  'Organization',
  'Partnership Type',
  'Community Size',
  'Contact (Email/WhatsApp)',
  'Proposed Note',
  'Source'
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
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

    var source = data.source || '';
    var sheetTab = data.sheetTab || '';

    if (source === 'partnership_modal' || sheetTab === 'Partnerships') {
      var partnerSheet = getOrCreatePartnershipSheet();
      partnerSheet.appendRow([
        data.submittedAt || new Date().toISOString(),
        data.organization || '',
        data.partnershipType || '',
        data.communitySize || '',
        data.contact || '',
        data.note || '',
        source || 'partnership_modal'
      ]);
    } else {
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
    }

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

function getOrCreatePartnershipSheet() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('Partnerships');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('Partnerships');
  }
  var firstRow = sheet.getRange(1, 1, 1, PARTNERSHIP_HEADERS.length).getValues()[0];
  var isBlank = firstRow.every(function (cell) { return String(cell).trim() === ''; });
  if (isBlank) {
    sheet.getRange(1, 1, 1, PARTNERSHIP_HEADERS.length).setValues([PARTNERSHIP_HEADERS]);
    sheet.getRange(1, 1, 1, PARTNERSHIP_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

function doGet(e) {
  return ContentService
    .createTextOutput("Visority '26 Webhook Active")
    .setMimeType(ContentService.MimeType.TEXT);
}
