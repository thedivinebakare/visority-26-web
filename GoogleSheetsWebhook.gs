/**
 * Visority '26 — Registration Webhook (Standard + VIP) + Clira read/write
 *
 * Receives registration + checkout submissions and appends them
 * to the active tab of this spreadsheet.
 *
 * Clira additions (all optional, safe to leave off):
 *   setupCliraColumns()  run once to append the Clira status/note headers
 *   doGet                returns the sheet as JSON for the Clira dashboard
 *   doPost action=update writes a status and/or note back to one row
 *
 * NOTE: Partnership leads use a separate dedicated webhook
 * (see PARTNER_SHEETS_WEBHOOK_URL in index.html).
 */

/* ============================================================ Clira config == */

var CLIRA_SHEET_NAME = '';        // '' = the active tab this script is bound to
var CLIRA_STATUS_HEADER = 'Follow-up Status';
var CLIRA_NOTE_HEADER = 'Last Note';
var CLIRA_UPDATED_HEADER = 'Status Updated';
var CLIRA_MAX_ROWS = 5000;        // hard stop on what Clira will ever read
var CLIRA_MAX_NOTE = 1000;

/**
 * Reads the shared secret from Project Settings > Script Properties.
 * Set CLIRA_SHARED_SECRET before deploying the Clira doGet/doGet-update pair.
 */
function cliraSecret() {
  return PropertiesService.getScriptProperties().getProperty('CLIRA_SHARED_SECRET') || '';
}

/** Length-safe constant-time comparison. Never leaks the secret by timing. */
function cliraSecretMatches(candidate) {
  var expected = cliraSecret();
  var given = String(candidate == null ? '' : candidate);
  if (!expected || given.length !== expected.length) return false;
  var mismatch = 0;
  for (var i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  }
  return mismatch === 0;
}

function cliraSheet() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  return CLIRA_SHEET_NAME ? book.getSheetByName(CLIRA_SHEET_NAME) : book.getActiveSheet();
}

/**
 * Accepts the key from an `X-Clira-Key` header, a `key` query parameter or a
 * `key` form field, so the same script works behind a server-side proxy.
 */
function cliraAuthorised(e) {
  if (!e) return false;
  var header = e.headers && e.headers['X-Clira-Key'];
  if (cliraSecretMatches(header)) return true;
  var param = e.parameter && e.parameter.key;
  return cliraSecretMatches(param);
}

function cliraJSON(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Finds the single row matching a lead. Prefers the stable sheet row number
 * supplied by doGet (verified against the email so a stale row can never write
 * to the wrong registrant), then falls back to a case-insensitive email match.
 * Returns { ok, row } or { ok:false, error } — ambiguity is always reported
 * rather than guessed, because writing to the wrong registrant is not
 * recoverable from the dashboard.
 */
function cliraFindRow(sheet, email, rowNumber) {
  var wanted = String(email || '').trim().toLowerCase();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: false, error: 'The sheet has no lead rows yet.' };

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var emailColumn = cliraHeaderIndex(headers, ['email', 'e-mail', 'email address']);

  /* Preferred identifier: the true sheet row number from doGet. Verified
   * against the email cell so blank/shifted data never overwrites a stranger. */
  var candidate = parseInt(rowNumber, 10);
  if (candidate >= 2 && candidate <= lastRow && emailColumn !== -1) {
    var cell = String(sheet.getRange(candidate, emailColumn + 1).getValue()).trim().toLowerCase();
    if (cell && cell === wanted) return { ok: true, row: candidate };
  }

  if (!wanted) return { ok: false, error: 'A lead email is required.' };
  if (emailColumn === -1) return { ok: false, error: 'No Email column was found in row 1.' };

  var values = sheet.getRange(2, emailColumn + 1, lastRow - 1, 1).getValues();
  var matches = [];
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === wanted) matches.push(i + 2);
  }

  if (matches.length === 0) {
    return { ok: false, error: 'No lead matches ' + wanted + '. Nothing was written.' };
  }
  if (matches.length > 1) {
    return {
      ok: false,
      error: 'Email ' + wanted + ' appears on rows ' + matches.join(', ') +
        '. Remove the duplicate in the sheet, then try again. Nothing was written.',
    };
  }
  return { ok: true, row: matches[0] };
}

/** Case-insensitive header lookup across a list of accepted names. */
function cliraHeaderIndex(headers, accepted) {
  for (var i = 0; i < headers.length; i++) {
    var label = String(headers[i]).trim().toLowerCase();
    if (accepted.indexOf(label) !== -1) return i;
  }
  return -1;
}

/* ============================================================== Setup (once) == */

/**
 * Appends the Clira headers if they are missing. Idempotent — safe to re-run.
 * Appends only, never inserts, so the existing registration webhook keeps
 * writing its nine original columns safely.
 *
 * Run this once, manually, from the editor. Clira offers the same action in
 * the dashboard when it detects the columns are absent.
 */
function setupCliraColumns() {
  var sheet = cliraSheet();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var existing = {};
  for (var i = 0; i < headers.length; i++) {
    existing[String(headers[i]).trim().toLowerCase()] = true;
  }

  var wanted = [CLIRA_STATUS_HEADER, CLIRA_NOTE_HEADER, CLIRA_UPDATED_HEADER];
  var missing = wanted.filter(function (name) { return !existing[name.toLowerCase()]; });
  if (missing.length === 0) return 'All Clira columns already exist. Nothing changed.';

  sheet.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
  sheet.setFrozenRows(1);
  return 'Added: ' + missing.join(', ');
}

/* ================================================================== doGet == */

function doGet(e) {
  var legacyTest = !e || !e.parameter;
  if (legacyTest) return cliraJSON({ ok: true, service: "Visority '26", mode: 'legacy' });

  if (!cliraAuthorised(e)) {
    return cliraJSON({ ok: false, error: 'Not authorised.' });
  }

  try {
    var sheet = cliraSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return cliraJSON({ ok: true, leads: [], columns: [], syncedAt: new Date().toISOString() });
    }
    if (lastRow > CLIRA_MAX_ROWS + 1) lastRow = CLIRA_MAX_ROWS + 1;

    var lastColumn = sheet.getLastColumn();
    var values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
    var columns = values[0].map(function (cell) { return String(cell).trim(); });
    var rows = values.slice(1)
      .map(function (row, offset) {
        /* offset + 2 is the true sheet row — captured before blank rows are
         * filtered so it stays valid for the write-back path. */
        var lead = { rowNumber: offset + 2 };
        columns.forEach(function (column, index) {
          if (!column) return;
          lead[column] = row[index] instanceof Date
            ? row[index].toISOString()
            : String(row[index] == null ? '' : row[index]).trim();
        });
        return lead;
      })
      .filter(function (lead) {
        // Skip blank rows rather than showing empty records.
        return Object.keys(lead).some(function (key) {
          return key !== 'rowNumber' && lead[key];
        });
      });

    return cliraJSON({
      ok: true,
      columns: columns,
      leads: rows,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return cliraJSON({ ok: false, error: error.toString() });
  }
}

/* ============================================================ doPost (Clira) == */

/**
 * Handles the Clira write-back: { action:'update', email, status, note }.
 * Requires the same shared secret as doGet.
 */
function cliraUpdate(payload) {
  var sheet = cliraSheet();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  var statusColumn = cliraHeaderIndex(headers, [CLIRA_STATUS_HEADER.toLowerCase(), 'status', 'follow up status']);
  var noteColumn = cliraHeaderIndex(headers, [CLIRA_NOTE_HEADER.toLowerCase(), 'notes', 'note']);
  var updatedColumn = cliraHeaderIndex(headers, [CLIRA_UPDATED_HEADER.toLowerCase()]);

  if (statusColumn === -1 && noteColumn === -1) {
    return { ok: false, error: 'No Clira columns found. Run setupCliraColumns() first.' };
  }

  var found = cliraFindRow(sheet, payload.email, payload.rowNumber);
  if (!found.ok) return found;

  var row = found.row;
  if (typeof payload.status === 'string' && payload.status.trim()) {
    if (statusColumn === -1) {
      return { ok: false, error: 'No status column on the sheet. Run setupCliraColumns().' };
    }
    sheet.getRange(row, statusColumn + 1).setValue(payload.status.trim().slice(0, 60));
  }

  if (typeof payload.note === 'string' && payload.note.trim()) {
    if (noteColumn === -1) {
      return { ok: false, error: 'No note column on the sheet. Run setupCliraColumns().' };
    }
    var note = payload.note.trim().slice(0, CLIRA_MAX_NOTE);
    sheet.getRange(row, noteColumn + 1).setValue(note);
    var current = cliraHeaderIndex(headers, ['last note', 'notes', 'note']);
    if (current !== -1 && current !== noteColumn) sheet.getRange(row, current + 1).setValue(note);
  }

  if (updatedColumn !== -1) {
    sheet.getRange(row, updatedColumn + 1).setValue(new Date().toISOString());
  }

  SpreadsheetApp.flush();
  return { ok: true, row: row, saved: true };
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var locked = lock.tryLock(10000);

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

    /* ---- Coupon Ledger dispatch. Runs before registration script lock. ---- */
    if (data && data.action === 'couponLedger') {
      return couponLedgerHandle(e);
    }

    /* ---- Clira write-back. Runs before the registration branch so a Clira
     * update is never mistaken for a new registration. ---- */
    if (data && data.action === 'update') {
      if (!locked) return cliraJSON({ ok: false, error: 'The sheet is busy. Try again.' });
      if (!cliraAuthorised(e) && !cliraSecretMatches(data.key)) {
        return cliraJSON({ ok: false, error: 'Not authorised.' });
      }
      return cliraJSON(cliraUpdate(data));
    }

    if (!locked) return cliraJSON({ result: 'error', error: 'The sheet is busy. Try again.' });

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var referral = verifiedRegistrationReferral(data);
    var referralColumns = registrationReferralColumns(sheet);
    var registrationRow = [
      data.submittedAt || new Date().toISOString(),
      data.fullName || '',
      data.email || '',
      data.role || '',
      data.whatsApp || '',
      data.coreChallenge || '',
      data.desiredExperience || '',
      data.customNote || '',
      data.selectedTier || 'standard'
    ];
    while (registrationRow.length < sheet.getLastColumn()) registrationRow.push('');
    registrationRow[referralColumns.code] = referral.code;
    registrationRow[referralColumns.name] = referral.name;
    sheet.appendRow(registrationRow);

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success', referralStored: !!referral.code }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

// Only the registration server resolves the central registry. Verify its
// signature before accepting names or codes sent to this public webhook.
function verifiedRegistrationReferral(data) {
  var empty = { code: '', name: '' };
  if (!/^VSR\d{3}$/.test(String(data.referralCode || ''))) return empty;
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty('REFERRAL_SHARED_SECRET') || props.getProperty('CLIRA_SHARED_SECRET');
  if (!secret || !data.ambassadorName || !data.referralSignature) return empty;
  var message = JSON.stringify([data.email, data.referralCode, data.ambassadorName, data.submittedAt]);
  var signature = Utilities.computeHmacSha256Signature(message, secret).map(function (byte) {
    return ('0' + ((byte + 256) % 256).toString(16)).slice(-2);
  }).join('');
  if (signature !== data.referralSignature) return empty;
  return { code: data.referralCode, name: data.ambassadorName };
}

function registrationReferralColumns(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  function column(aliases, title) {
    var index = cliraHeaderIndex(headers, aliases);
    if (index !== -1) return index;
    index = headers.length;
    sheet.getRange(1, index + 1).setValue(title);
    headers.push(title);
    return index;
  }
  return {
    code: column(['referral code', 'referralcode'], 'Referral Code'),
    name: column(['ambassador', 'ambassadorname', 'ambassador name'], 'Ambassador')
  };
}


/* ==================================================== Coupon Ledger == */
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
