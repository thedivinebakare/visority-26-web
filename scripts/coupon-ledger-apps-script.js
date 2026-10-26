/* Apps Script adapter. Bundled with server/coupon-state.cjs for deployment.
 * Add the generated file to the EXISTING bound Apps Script project.
 * Dispatch action=couponLedger before the existing doPost takes its lock.
 * No lead rows or Clira configuration are read or modified.
 */
function couponLedgerHandle(e) {
  function reply(value) {
    return ContentService.createTextOutput(JSON.stringify(value))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var protocol = 'visority-coupon-ledger-v1';
  var envelope, command;
  try {
    envelope = JSON.parse(e.postData.contents);
    var secret = PropertiesService.getScriptProperties().getProperty('COUPON_LEDGER_SECRET') ||
                 PropertiesService.getScriptProperties().getProperty('CLIRA_SHARED_SECRET');
    if (!secret || typeof envelope.payload !== 'string' ||
        envelope.payload.length > 100000 || !/^[a-f0-9]{64}$/.test(envelope.signature || '')) {
      return reply({ok: false, code: 'UNAUTHORIZED'});
    }
    var signature = Utilities.computeHmacSha256Signature(envelope.payload, secret)
      .map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
    var difference = 0;
    for (var i = 0; i < signature.length; i++) difference |= signature.charCodeAt(i) ^ envelope.signature.charCodeAt(i);
    if (difference) return reply({ok: false, code: 'UNAUTHORIZED'});
    command = JSON.parse(envelope.payload);
    if (command.protocol !== protocol || !Number.isFinite(command.at) ||
        Math.abs(Date.now() - command.at) > 120000 || !/^[a-z0-9-]{20,80}$/i.test(command.id || '')) {
      return reply({ok: false, code: 'INVALID_REQUEST'});
    }
  } catch (_) { return reply({ok: false, code: 'INVALID_REQUEST'}); }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return reply({ok: false, code: 'LEDGER_BUSY'});
  try {
    var book = SpreadsheetApp.getActiveSpreadsheet();
    var name = '_VisorityCouponLedger';
    var sheet = book.getSheetByName(name);
    var state;
    if (!sheet) {
      var active = book.getActiveSheet();
      try { sheet = book.insertSheet(name); } finally { if (active) book.setActiveSheet(active); }
    }
    var length = sheet.getLastRow();
    if (length < 2) {
      var maximum = Number.isInteger(command.maximum) && command.maximum > 0 ? command.maximum : 20;
      var couponName = typeof command.coupon === 'string' && command.coupon ? command.coupon : 'CATERSTUDIOS';
      state = {maximum: maximum, entries: Array.isArray(command.entries) ? command.entries : []};
      couponTransition(state, {op: 'status'});
      var initial = [[protocol, couponName, state.maximum, ''], ['Reference', 'Status', 'CreatedAt', 'ExpiresAt']]
        .concat(state.entries.map(function (v) { return [v.reference, v.status, v.createdAt || '', v.expiresAt || '']; }));
      sheet.getRange(1, 1, initial.length, 4).setValues(initial);
      SpreadsheetApp.flush();
    } else {
      if (length > 10000) throw Error('Invalid ledger size');
      var rows = sheet.getRange(1, 1, length, 4).getValues();
      if (rows[0][0] !== protocol || rows[0][1] !== command.coupon ||
          rows[0][2] !== command.maximum || rows[1][0] !== 'Reference' || rows[1][1] !== 'Status') {
        throw Error('Ledger configuration mismatch');
      }
      state = {maximum: rows[0][2], entries: rows.slice(2).map(function (r) {
        return {
          reference: String(r[0] || ''),
          status: String(r[1] || ''),
          createdAt: Number(r[2]) || undefined,
          expiresAt: Number(r[3]) || undefined
        };
      })};
    }
    var before = JSON.stringify(state.entries);
    var result = couponTransition(state, command.op === 'bootstrap' ? {op: 'status'} : command);
    if (before !== JSON.stringify(state.entries)) {
      if (state.entries.length > 9998) throw Error('Ledger capacity reached');
      sheet.clearContents();
      var outputRows = [[protocol, command.coupon, state.maximum, ''], ['Reference', 'Status', 'CreatedAt', 'ExpiresAt']]
        .concat(state.entries.map(function (v) {
          return [v.reference, v.status, v.createdAt || '', v.expiresAt || ''];
        }));
      sheet.getRange(1, 1, outputRows.length, 4).setValues(outputRows);
      SpreadsheetApp.flush();
    }
    result.protocol = protocol; result.id = command.id;
    return reply(result);
  } catch (err) {
    return reply({ok: false, code: 'LEDGER_UNAVAILABLE', error: String(err), protocol: protocol, id: command.id});
  } finally { lock.releaseLock(); }
}
