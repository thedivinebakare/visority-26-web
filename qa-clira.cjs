const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const originalFetch = global.fetch;

async function call(options = {}) {
  let status = 500;
  let body = '';
  await require('./server/clira.cjs')(
    { method: options.method || 'GET', headers: options.headers || {}, query: options.query || {}, body: options.body },
    { statusCode: 500, setHeader() {}, end(text) { status = this.statusCode; body = text; } }
  );
  try { return { status, data: JSON.parse(body) }; } catch { return { status, data: body }; }
}

(async () => {
  /* --- 1. Template logic, run against the real config file --- */
  const config = readFileSync('./assets/js/clira-config.js', 'utf8');
  const sandbox = { window: {} };
  new Function('window', config)(sandbox.window);
  const CLIRA = sandbox.window.CLIRA;
  assert.equal(typeof CLIRA.templates.first, 'string');
  assert(Array.isArray(CLIRA.statuses) && CLIRA.statuses.length === 6);

  /* Mirror of clira.js renderTemplate + normalise, applied to the real config. */
  const normalise = (p) => String(p || '').replace(/[^\d]/g, '').replace(/^00/, '');
  const render = (tpl, lead) => {
    let body = tpl;
    if (!lead.ticket) {
      body = body
        .replace(/[^\n]*\{\{[^\}]*ticket[^\}]*\}\}[^\n]*(\n{2,})?/gi, '')
        .replace(/\n{3,}/g, '\n\n');
    }
    return body
      .replace(/\{\{\s*first_name\s*\}\}/g, String(lead.name).split(/\s+/)[0])
      .replace(/\{\{\s*ticket_or_registration_type\s*\}\}/g, lead.ticket || '')
      .trim();
  };

  assert.equal(normalise('+234 801 234 5678'), '2348012345678');
  assert.equal(normalise('0801 234 5678'), '08012345678');
  assert.equal(normalise('+234 (801) 234-5678'), '2348012345678');

  const withTicket = render(CLIRA.templates.first, { name: 'Amara Osei', ticket: 'Premium' });
  assert(withTicket.includes('Hi Amara,'), 'first name substituted');
  assert(withTicket.includes('Premium'), 'ticket retained when present');

  const noTicket = render(CLIRA.templates.first, { name: 'Uche Maduka', ticket: '' });
  assert(!noTicket.includes('I noticed you registered'), 'ticket sentence removed entirely');
  assert(!noTicket.includes('{{'), 'no placeholders left');
  assert(!noTicket.includes('\n\n\n'), 'no triple blank lines');
  assert(noTicket.includes('Hi Uche,'), 'name still present after removal');

  const nudge = render(CLIRA.templates.nudge, { name: 'Tunde Balogun', ticket: '' });
  assert(nudge.includes('just checking back in'), 'nudge template renders');

  /* --- 2. Auth gate --- */
  process.env.CLIRA_ACCESS_KEY = 'test-key-12345678901234567890123456789012';
  process.env.CLIRA_SHEETS_URL = 'https://script.google.com/macros/s/test/exec';

  assert.equal((await call()).status, 401, 'no key -> 401');
  assert.equal((await call({ headers: { 'X-Clira-Key': 'short' } })).status, 401, 'wrong length -> 401');
  assert.equal((await call({ headers: { 'X-Clira-Key': 'wrong-key-but-same-length-xxxxxxxxxxxxxxx' } })).status, 401, 'wrong key -> 401');
  assert.equal(require('./server/clira.cjs').authorised({ headers: {} }), false, 'no configured key -> closed');

  /* --- 3. GET maps sheet headers to Clira fields --- */
  global.fetch = async (url, opts) => {
    received = { url, opts };
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        ok: true,
        columns: ['submittedAt', 'fullName', 'email', 'role', 'whatsApp', 'selectedTier', 'Follow-up Status', 'Last Note'],
        leads: [{
          submittedAt: '2026-10-01T09:00:00.000Z',
          fullName: 'Amara Osei',
          email: 'amara.osei@example.test',
          role: 'Founder',
          whatsApp: '+234 801 234 5678',
          selectedTier: 'vip',
          'Follow-up Status': 'Follow Up',
          'Last Note': 'Interested in premium',
        }],
        syncedAt: '2026-10-01T09:00:00.000Z',
      }),
      json: async () => ({ ok: true }),
    };
  };
  let received;

  let r = await call({ headers: { 'X-Clira-Key': process.env.CLIRA_ACCESS_KEY } });
  assert.equal(r.status, 200);
  const lead = r.data.leads[0];
  assert.equal(lead.name, 'Amara Osei');
  assert.equal(lead.email, 'amara.osei@example.test');
  assert.equal(lead.phone, '+234 801 234 5678');
  assert.equal(lead.ticket, 'vip');
  assert.equal(lead.status, 'Follow Up');
  assert.equal(lead.note, 'Interested in premium');
  assert.equal(lead.source, '', 'unconfigured column resolves to empty string');
  assert.equal(lead.role, 'Founder');
  assert.equal(lead.date, '2026-10-01T09:00:00.000Z');
  assert.equal(r.data.demo, false);
  assert.equal(received.opts.headers['X-Clira-Key'], process.env.CLIRA_ACCESS_KEY, 'secret forwarded to Apps Script, not to browser');
  assert.equal(new URL(received.url).searchParams.get('key'), process.env.CLIRA_ACCESS_KEY, 'Apps Script receives key via supported query parameter');

  /* --- 4. POST validation --- */
  const post = (payload) => call({
    method: 'POST',
    headers: { 'X-Clira-Key': process.env.CLIRA_ACCESS_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  await post({ action: 'update', email: 'a@b.co', status: 'Contacted' });
  assert.equal(JSON.parse(received.opts.body).key, process.env.CLIRA_ACCESS_KEY, 'Apps Script receives update key in JSON body');

  assert.equal((await post({ action: 'update', email: 'a@b.co', status: 'Ghost' })).status, 400, 'unknown status rejected');
  assert.equal((await post({ action: 'update', email: '', status: 'New' })).status, 400, 'missing email rejected');
  assert.equal((await post({ action: 'update', email: 'not-an-email', status: 'New' })).status, 400, 'malformed email rejected');
  assert.equal((await post({ action: 'update', email: 'a@b.co' })).status, 400, 'empty payload rejected');
  assert.equal((await post({ action: 'update', email: 'a@b.co', note: 'x'.repeat(1001) })).status, 400, 'over-long note rejected');

  /* --- 5. Ambiguous email surfaces the sheet's message --- */
  global.fetch = async () => ({
    ok: false,
    status: 409,
    text: async () => JSON.stringify({ ok: false, error: "Email a@b.co appears on rows 2, 5. Remove the duplicate in the sheet, then try again. Nothing was written." }),
    json: async () => ({ ok: false }),
  });
  const ambiguous = await post({ action: 'update', email: 'a@b.co', status: 'Contacted' });
  assert.equal(ambiguous.status, 409);
  assert(ambiguous.data.error.includes('rows 2, 5'), 'ambiguity detail preserved for the user');

  /* --- 6. Non-JSON connector response is a visible 502, not a crash --- */
  global.fetch = async () => ({ ok: true, status: 200, text: async () => '<html>Sign in</html>', json: async () => ({}) });
  const html = await call({ headers: { 'X-Clira-Key': process.env.CLIRA_ACCESS_KEY } });
  assert.equal(html.status, 502);
  assert(/valid JSON|deploy/i.test(html.data.error), 'explains what went wrong');

  /* --- 7. Demo mode serves synthetic data and writes nothing --- */
  delete process.env.CLIRA_SHEETS_URL;
  let touchedSheet = false;
  global.fetch = async () => { touchedSheet = true; throw new Error('must not reach the sheet'); };

  r = await call({ headers: { 'X-Clira-Key': process.env.CLIRA_ACCESS_KEY } });
  assert.equal(r.status, 200);
  assert.equal(r.data.demo, true);
  assert.equal(r.data.leads.length, 14, 'synthetic records present');
  assert.equal(touchedSheet, false, 'demo mode never calls the sheet');

  const demoSave = await post({ action: 'update', email: 'amara.osei@example.test', status: 'Contacted' });
  assert.equal(demoSave.status, 200);
  assert.equal(demoSave.data.savedLocally, true, 'demo save is session-only');
  assert.equal(touchedSheet, false, 'demo save never calls the sheet');

  /* --- 8. Every status used in the sample data is a real status --- */
  const known = new Set(CLIRA.statuses.map((s) => s.toLowerCase()));
  for (const sample of r.data.leads) {
    assert(known.has(String(sample.status).toLowerCase()), 'sample status is in the pipeline: ' + sample.status);
  }

  console.log('PASS qa-clira — phone normalisation, template ticket-removal, auth gate (missing/short/wrong/unconfigured), header mapping, POST validation, ambiguous-email error, non-JSON connector handling, demo isolation, sample status integrity. No real sheet contacted.');
})().finally(() => {
  global.fetch = originalFetch;
  delete process.env.CLIRA_ACCESS_KEY;
  delete process.env.CLIRA_SHEETS_URL;
});
