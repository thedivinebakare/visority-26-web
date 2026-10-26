const assert = require('node:assert/strict');
const couponLedger = require('./server/coupon-ledger-client.cjs');
const handler = require('./api/coupon-availability.js');

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    end(body) {
      this.body = body;
      try { this.json = JSON.parse(body); } catch {}
    }
  };
}

(async () => {
  console.log('--- TEST: Coupon Availability Read-Only Status & Logic ---');

  // Case A: redeemed = 0, reserved = 0 -> available = 20, exhausted = false
  couponLedger.setTransport(async (cmd) => {
    return { ok: true, maximum: 20, used: 0, held: 0, entries: [] };
  });

  let res = mockRes();
  await handler({ method: 'GET', url: '/api/coupon-availability?code=CATERSTUDIOS', headers: { host: 'localhost' } }, res);
  assert.equal(res.statusCode, 200, 'Case A HTTP status');
  assert.equal(res.json.max, 20);
  assert.equal(res.json.redeemed, 0);
  assert.equal(res.json.reserved, 0);
  assert.equal(res.json.available, 20);
  assert.equal(res.json.exhausted, false);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(typeof res.json.updatedAt, 'string');
  assert.equal(res.json.entries, undefined, 'Must not expose raw entries');
  console.log('Case A (0 redeemed, 0 reserved -> 20 available): PASS');

  // Case B: redeemed = 11, reserved = 2 -> available = 7, exhausted = false
  couponLedger.setTransport(async (cmd) => {
    return {
      ok: true,
      maximum: 20,
      used: 11,
      held: 2,
      entries: [
        { reference: 'ref-1', status: 'redeemed' },
        { reference: 'ref-2', status: 'reserved' }
      ]
    };
  });

  res = mockRes();
  await handler({ method: 'GET', url: '/api/coupon-availability?code=CATERSTUDIOS', headers: { host: 'localhost' } }, res);
  assert.equal(res.statusCode, 200, 'Case B HTTP status');
  assert.equal(res.json.max, 20);
  assert.equal(res.json.redeemed, 11);
  assert.equal(res.json.reserved, 2);
  assert.equal(res.json.available, 7);
  assert.equal(res.json.exhausted, false);
  // Security verification: no references or entries leaked
  assert.equal(res.json.entries, undefined);
  assert.equal(JSON.stringify(res.json).includes('ref-1'), false);
  console.log('Case B (11 redeemed, 2 reserved -> 7 available): PASS');

  // Case C: redeemed = 19, reserved = 1 -> available = 0, exhausted = true
  couponLedger.setTransport(async (cmd) => {
    return { ok: true, maximum: 20, used: 19, held: 1, entries: [] };
  });

  res = mockRes();
  await handler({ method: 'GET', url: '/api/coupon-availability?code=CATERSTUDIOS', headers: { host: 'localhost' } }, res);
  assert.equal(res.statusCode, 200, 'Case C HTTP status');
  assert.equal(res.json.max, 20);
  assert.equal(res.json.redeemed, 19);
  assert.equal(res.json.reserved, 1);
  assert.equal(res.json.available, 0);
  assert.equal(res.json.exhausted, true);
  console.log('Case C (19 redeemed, 1 reserved -> 0 available, exhausted: true): PASS');

  // Case D: final reservation expires -> 1 available, exhausted = false
  couponLedger.setTransport(async (cmd) => {
    return { ok: true, maximum: 20, used: 19, held: 0, entries: [] };
  });

  res = mockRes();
  await handler({ method: 'GET', url: '/api/coupon-availability?code=CATERSTUDIOS', headers: { host: 'localhost' } }, res);
  assert.equal(res.statusCode, 200, 'Case D HTTP status');
  assert.equal(res.json.max, 20);
  assert.equal(res.json.redeemed, 19);
  assert.equal(res.json.reserved, 0);
  assert.equal(res.json.available, 1);
  assert.equal(res.json.exhausted, false);
  console.log('Case D (final reservation expires -> 1 available, exhausted: false): PASS');

  // Case E: redeemed = 20, reserved = 0 -> available = 0, exhausted = true
  couponLedger.setTransport(async (cmd) => {
    return { ok: true, maximum: 20, used: 20, held: 0, entries: [] };
  });

  res = mockRes();
  await handler({ method: 'GET', url: '/api/coupon-availability?code=CATERSTUDIOS', headers: { host: 'localhost' } }, res);
  assert.equal(res.statusCode, 200, 'Case E HTTP status');
  assert.equal(res.json.max, 20);
  assert.equal(res.json.redeemed, 20);
  assert.equal(res.json.reserved, 0);
  assert.equal(res.json.available, 0);
  assert.equal(res.json.exhausted, true);
  console.log('Case E (20 redeemed, 0 reserved -> 0 available, exhausted: true): PASS');

  // Case F: Error handling when ledger is unavailable
  couponLedger.setTransport(async () => {
    return { ok: false, code: 'LEDGER_UNAVAILABLE', message: 'Down' };
  });

  res = mockRes();
  await handler({ method: 'GET', url: '/api/coupon-availability?code=CATERSTUDIOS', headers: { host: 'localhost' } }, res);
  assert.equal(res.statusCode, 503, 'Error HTTP status');
  assert.equal(res.json.ok, false);
  console.log('Case F (Ledger unavailable returns 503 gracefully): PASS');

  // Case G: Method not allowed
  res = mockRes();
  await handler({ method: 'DELETE', url: '/api/coupon-availability', headers: { host: 'localhost' } }, res);
  assert.equal(res.statusCode, 405, 'Disallowed method');
  console.log('Case G (Disallowed methods return 405): PASS');

  // Reset transport
  couponLedger.setTransport(null);

  console.log('\n===============================================');
  console.log('ALL COUPON AVAILABILITY TESTS COMPLETED: PASS');
  console.log('===============================================');
})().catch(err => {
  console.error('QA failed:', err);
  process.exit(1);
});
