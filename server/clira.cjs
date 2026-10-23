/**
 * Visority '26 — Clira lead API
 *
 * GET  /api/clira-leads            -> lead list (requires the access key)
 * POST /api/clira-leads            -> { action:'update', email, status, note }
 *
 * Two rules this file exists to enforce:
 *   1. The Google Apps Script URL and secret never reach the browser.
 *   2. Without a valid CLIRA_ACCESS_KEY, no lead data is returned at all.
 *
 * If CLIRA_SHEETS_URL is unset, Clira serves clira/sample-leads.json with
 * demo:true. That keeps the dashboard reviewable without touching real rows.
 */
const crypto = require('node:crypto');
const { join, resolve } = require('node:path');
const { readFileSync } = require('node:fs');
const { json, body, originAllowed } = require('./payment.cjs');

const ROOT = resolve(__dirname, '..');

/* Mirrors assets/js/clira-config.js. The browser copy owns the UI; this copy
 * guards the wire. Keep the status list identical in both places. */
const STATUSES = [
  'New',
  'Contacted',
  'Interested',
  'Follow Up',
  'Registered',
  'Not Interested',
  'Closed',
];

const columns = {
  name: 'fullName',
  phone: 'whatsApp',
  email: 'email',
  ticket: 'selectedTier',
  role: 'role',
  source: '', // set once the sheet has a source column
  date: 'submittedAt',
  status: 'Follow-up Status',
  note: 'Last Note',
  challenge: 'coreChallenge',
  goal: 'desiredExperience',
  reason: 'customNote',
  referralCode: 'Referral Code',
  ambassadorName: 'Ambassador',
};

const accessKey = () => process.env.CLIRA_ACCESS_KEY || '';
const sheetsUrl = () => process.env.CLIRA_SHEETS_URL || '';

function keyFrom(req) {
  const headers = req.headers || {};
  const bearer = /^Bearer\s+(.+)$/i.exec(headers.authorization || '');
  if (bearer) return bearer[1].trim();

  const raw = String(headers.authorization || '').trim();
  if (raw) return raw;

  /* Header names arrive lowercased from Node/Vercel, but be tolerant of any casing. */
  const match = Object.keys(headers).find((name) => name.toLowerCase() === 'x-clira-key');
  return match ? String(headers[match]).trim() : '';
}

function authorised(req) {
  const expected = accessKey();
  const given = keyFrom(req);
  if (!expected || !given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/* Demo-only in-memory overlay. Without a sheet connector a save cannot reach a
 * spreadsheet, so status/note changes are kept here so a refresh during local
 * preview still shows what was saved. Production writes always go to the sheet. */
const demoOverrides = new Map();

function demoKey(lead) {
  const email = String(lead.email || '').trim().toLowerCase();
  if (email) return 'email:' + email;
  const row = Number(lead.rowNumber);
  return row > 0 ? 'row:' + row : '';
}

function demoPayload() {
  const file = readFileSync(join(ROOT, 'clira', 'sample-leads.json'), 'utf8');
  const data = JSON.parse(file);
  for (const lead of data.leads || []) {
    const override = demoOverrides.get(demoKey(lead));
    if (!override) continue;
    if (override.status) lead.status = override.status;
    if (override.note !== undefined) lead.note = override.note;
  }
  return { ...data, columns: Object.values(columns).filter(Boolean) };
}

const ambassadorsRegistry = require('./ambassadors.cjs');

/* Maps a raw sheet row (keyed by header text) onto the Clira field names.
 * A column configured as "" is absent, so its field resolves to ''. */
function mapRow(row) {
  const aliases = {
    name: ['Name'], phone: ['Phone Number'], email: ['Email'],
    ticket: ['Pass Tier'], role: ['Category'], date: ['Time'],
    challenge: ['Current Problems', 'Biggest challenge'],
    goal: ['Desired Experience', 'Desired Result', 'What they want'],
    reason: ['Why Visority', 'Reason for joining', 'Custom Note'],
    referralCode: ['referralCode', 'referral_code', 'referral code', 'ambassadorCode', 'ambassador_code', 'referredBy', 'referred_by'],
    ambassadorName: ['ambassadorName', 'ambassador_name', 'ambassador name', 'Ambassador', 'ambassador'],
  };
  const read = (field) => {
    const header = columns[field];
    if (!header) return '';
    const candidates = [header, ...(aliases[field] || [])];
    const key = Object.keys(row).find(key => candidates.some(candidate => candidate.toLowerCase() === key.trim().toLowerCase()));
    return key ? String(row[key] == null ? '' : row[key]).trim() : '';
  };
  const rawCode = read('referralCode');
  const rawName = read('ambassadorName');
  const resolved = ambassadorsRegistry.resolve(rawCode);
  const referralCode = resolved ? resolved.code : rawCode;
  const ambassadorName = resolved ? resolved.name : rawName;
  return {
    name: read('name'),
    phone: read('phone'),
    email: read('email'),
    ticket: read('ticket'),
    role: read('role'),
    source: read('source'),
    date: read('date'),
    status: read('status'),
    note: read('note'),
    challenge: read('challenge'),
    goal: read('goal'),
    reason: read('reason'),
    referralCode,
    ambassadorName,
    rowNumber: Number(row.rowNumber) || 0,
  };
}

async function fromSheets(url, status) {
  const target = new URL(url);
  target.searchParams.set('key', accessKey());
  if (status && status !== 'All') target.searchParams.set('status', status);

  const response = await fetch(target, {
    headers: { 'X-Clira-Key': accessKey() },
    signal: AbortSignal.timeout(20000),
    redirect: 'follow',
  });
  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const error = new Error(
      response.ok
        ? 'The sheet connector did not return valid JSON. Check the Apps Script deployment.'
        : 'The sheet connector returned ' + response.status + '. Check the Apps Script deployment.'
    );
    error.statusCode = 502;
    throw error;
  }

  if (!response.ok || !data.ok) {
    const error = new Error(data.error || 'The sheet connector rejected the request.');
    error.statusCode = 502;
    throw error;
  }

  return {
    leads: (data.leads || []).map(mapRow),
    columns: data.columns || Object.values(columns).filter(Boolean),
    syncedAt: data.syncedAt || new Date().toISOString(),
    demo: false,
  };
}

async function handleRead(req, res) {
  const url = sheetsUrl();
  if (!url) return json(res, 200, demoPayload());

  try {
    const status = String((req.query && req.query.status) || '').slice(0, 40);
    return json(res, 200, await fromSheets(url, status));
  } catch (error) {
    return json(res, error.statusCode || 502, {
      error: error.message,
      demo: false,
    });
  }
}

async function handleUpdate(req, res, input) {
  const email = String(input.email || '').trim().toLowerCase();
  const status = String(input.status || '').trim();
  const note = String(input.note || '').trim();
  const rowNumber = Number.parseInt(String(input.rowNumber == null ? '' : input.rowNumber), 10);

  if (!email) return json(res, 400, { error: 'A lead email is required.' });
  if (status && !STATUSES.includes(status)) {
    return json(res, 400, { error: 'Unknown status: ' + status });
  }
  if (!status && !note) return json(res, 400, { error: 'Nothing to save.' });
  if (note.length > 1000) return json(res, 400, { error: 'Keep the note under 1000 characters.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(res, 400, { error: 'That lead has no usable email address.' });
  }

  const url = sheetsUrl();
  if (!url) {
    const key = demoKey({ email });
    if (key) {
      const previous = demoOverrides.get(key) || {};
      if (status) previous.status = status;
      if (note) previous.note = note;
      demoOverrides.set(key, previous);
    }
    return json(res, 200, { ...demoPayload(), savedLocally: true, row: 0 });
  }

  /* Prefer the stable sheet row number; the Apps Script still verifies it
   * against the email so a stale row can never overwrite the wrong lead. */
  const payload = { action: 'update', key: accessKey(), email, status, note };
  if (Number.isInteger(rowNumber) && rowNumber > 0) payload.rowNumber = rowNumber;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Clira-Key': accessKey() },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
      redirect: 'follow',
    });
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return json(res, 502, { error: 'The sheet did not confirm the save. Refresh to check before retrying.' });
    }
    if (!data.ok) return json(res, 409, { error: data.error || 'The sheet rejected that update.' });
    return json(res, 200, { ok: true, row: data.row, savedAt: new Date().toISOString() });
  } catch (error) {
    return json(res, 502, {
      error: 'Could not confirm the save. Refresh to check before retrying.',
    });
  }
}

async function handler(req, res) {
  if (!authorised(req)) {
    return json(res, 401, { error: 'Invalid Clira access key.' });
  }
  if (req.method === 'GET') return handleRead(req, res);
  if (req.method === 'POST') {
    if (!originAllowed(req)) return json(res, 403, { error: 'Invalid origin.' });
    try {
      return await handleUpdate(req, res, await body(req));
    } catch {
      return json(res, 400, { error: 'Could not read that request.' });
    }
  }
  return json(res, 405, { error: 'Use GET or POST.' });
}

module.exports = handler;
module.exports.authorised = authorised;
module.exports.mapRow = mapRow;
module.exports.STATUSES = STATUSES;
