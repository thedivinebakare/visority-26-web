// Generated: node scripts/build-coupon-ledger.cjs
// Pure ledger transition shared with the Google Apps Script deployment bundle.
// The caller MUST hold the durable backend lock across read/transition/write.
// Prices and coupon identity remain in coupons.cjs; this module adds no coupon.
function couponTransition(state, command) {
  if (!state || !Number.isInteger(state.maximum) || state.maximum < 1 ||
      !Array.isArray(state.entries)) throw Error('Invalid coupon ledger');
  var entries = state.entries;
  var seen = {};
  entries.forEach(function (entry) {
    if (!entry || typeof entry.reference !== 'string' || seen[entry.reference] ||
        ['reserved', 'redeemed', 'released'].indexOf(entry.status) < 0) {
      throw Error('Invalid coupon ledger entry');
    }
    seen[entry.reference] = true;
  });

  // Auto-expire reservations whose TTL has passed (Paystack session timeout = 10 mins)
  var now = Number.isFinite(command.now) ? command.now : Date.now();
  entries.forEach(function (e) {
    if (e.status === 'reserved' && Number.isFinite(e.expiresAt) && now >= e.expiresAt) {
      e.status = 'released';
      e.releasedAt = now;
      e.releaseReason = 'provider_session_timeout';
    }
  });

  var used = entries.filter(function (e) { return e.status === 'redeemed'; }).length;
  var held = entries.filter(function (e) { return e.status === 'reserved'; }).length;
  function result(extra) {
    return Object.assign({used: used, held: held, maximum: state.maximum,
      available: Math.max(0, state.maximum - used - held)}, extra);
  }
  // Preserve history even if a pre-rollout audit discovers over-cap usage.
  if (command.op === 'status') return result({ok: true, entries: entries});
  if (!/^viso26-[a-z0-9-]{1,100}$/i.test(command.reference || '')) {
    throw Error('Invalid payment reference');
  }
  var entry = entries.find(function (e) { return e.reference === command.reference; });
  if (command.op === 'reserve') {
    if (entry) return result({ok: entry.status === 'reserved', status: entry.status,
      code: entry.status === 'released' ? 'REFERENCE_RELEASED' : 'REFERENCE_EXISTS'});
    if (used >= state.maximum) return result({ok: false, code: 'COUPON_EXHAUSTED'});
    if (used + held >= state.maximum) return result({ok: false, code: 'COUPON_BUSY'});
    var ttl = Number.isFinite(command.ttl) ? command.ttl : 10 * 60 * 1000;
    var newEntry = {
      reference: command.reference,
      status: 'reserved',
      createdAt: now,
      expiresAt: now + ttl
    };
    entries.push(newEntry);
    held++;
    return result({ok: true, status: 'reserved', expiresAt: newEntry.expiresAt});
  }
  if (!entry) return result({ok: false, code: 'REFERENCE_UNKNOWN'});
  if (command.op === 'commit') {
    if (entry.status === 'redeemed') return result({ok: true, duplicate: true});
    // Never silently conceal an unsafe release or accept an unreserved payment.
    if (entry.status !== 'reserved') return result({ok: false, code: 'LATE_PAYMENT'});
    entry.status = 'redeemed';
    entry.redeemedAt = now;
    used++; held--;
    return result({ok: true, duplicate: false});
  }
  if (command.op === 'release') {
    // Trusted server proof required; 'abandoned' and local expiry are NOT proof.
    if (command.proof !== 'provider_irrevocably_expired' &&
        command.proof !== 'initialization_definitively_rejected') {
      return result({ok: false, code: 'RELEASE_UNPROVEN'});
    }
    if (entry.status === 'redeemed') return result({ok: false, code: 'ALREADY_REDEEMED'});
    if (entry.status === 'released') return result({ok: true, duplicate: true});
    entry.status = 'released';
    entry.releasedAt = now;
    entry.releaseProof = command.proof;
    held--;
    return result({ok: true, duplicate: false});
  }
  throw Error('Invalid coupon operation');
}
if (typeof module !== 'undefined') module.exports = {couponTransition};

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
      var maximum = Number.isInteger(command.maximum) && command.maximum > 0 ? command.maximum : 20;
      var couponName = typeof command.coupon === 'string' && command.coupon ? command.coupon : 'CATERSTUDIOS';
      state = {maximum: maximum, entries: Array.isArray(command.entries) ? command.entries : []};
      couponTransition(state, {op: 'status'});
      var active = book.getActiveSheet();
      try { sheet = book.insertSheet(name); } finally { if (active) book.setActiveSheet(active); }
      var initial = [[protocol, couponName, state.maximum], ['Reference', 'Status', 'CreatedAt', 'ExpiresAt']]
        .concat(state.entries.map(function (v) { return [v.reference, v.status, v.createdAt || '', v.expiresAt || '']; }));
      sheet.getRange(1, 1, initial.length, 4).setValues(initial);
      SpreadsheetApp.flush();
    } else {
      var length = sheet.getLastRow();
      if (length < 2 || length > 10000) throw Error('Invalid ledger size');
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
      var outputRows = [[protocol, command.coupon, state.maximum], ['Reference', 'Status', 'CreatedAt', 'ExpiresAt']]
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
