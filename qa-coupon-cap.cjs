const assert = require('node:assert/strict');
const fs = require('node:fs');
const { couponTransition: change } = require('./server/coupon-state.cjs');
const couponLedger = require('./server/coupon-ledger-client.cjs');
const coupons = require('./server/coupons.cjs');

function seed(n) {
  return {
    maximum: 20,
    entries: Array.from({ length: n }, (_, i) => ({
      reference: 'viso26-paid-' + i,
      status: 'redeemed'
    }))
  };
}

const reserve = (reference, extra = {}) => ({ op: 'reserve', reference, ...extra });
const commit = reference => ({ op: 'commit', reference });

(async () => {
  console.log('--- TEST 1: qa-coupon-cap.cjs (Local ledger transitions) ---');
  let state = seed(19);
  assert.equal(change(state, reserve('viso26-last')).ok, true);
  assert.equal(change(state, commit('viso26-last')).used, 20);
  assert.equal(change(state, reserve('viso26-next')).code, 'COUPON_EXHAUSTED');
  for (let i = 0; i < 5; i++) {
    assert.equal(change(state, commit('viso26-last')).duplicate, true);
    assert.equal(change(state, { op: 'status' }).used, 20);
  }
  state = seed(19);
  assert.equal(change(state, reserve('viso26-failure')).ok, true);
  assert.equal(change(state, { op: 'release', reference: 'viso26-failure', proof: 'abandoned' }).code, 'RELEASE_UNPROVEN');
  assert.equal(change(state, reserve('viso26-too-early')).code, 'COUPON_BUSY');
  assert.equal(change(state, { op: 'release', reference: 'viso26-failure', proof: 'provider_irrevocably_expired' }).ok, true);
  assert.equal(change(state, reserve('viso26-retry')).ok, true);
  assert.equal(change(state, commit('viso26-retry')).used, 20);
  assert.equal(change(state, commit('viso26-failure')).code, 'LATE_PAYMENT');
  assert.equal(change(state, reserve('viso26-failure')).ok, false);
  assert.equal(change(state, { op: 'release', reference: 'viso26-retry', proof: 'provider_irrevocably_expired' }).code, 'ALREADY_REDEEMED');
  console.log('qa-coupon-cap.cjs: PASS');

  console.log('--- TEST 2: 19 -> final slot concurrency ---');
  state = seed(19);
  let queue = Promise.resolve();
  const locked = command => {
    const task = queue.then(() => change(state, command));
    queue = task.catch(() => {});
    return task;
  };
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => locked(reserve('viso26-race-' + i))));
  assert.equal(results.filter(r => r.ok).length, 1, 'Only one concurrent reservation should succeed');
  assert.equal(results.filter(r => r.code === 'COUPON_BUSY').length, 19, 'All other 19 must receive COUPON_BUSY');
  assert.equal(change(state, { op: 'status' }).held, 1);
  assert.equal(change(state, { op: 'status' }).used, 19);
  assert.equal(change(state, { op: 'status' }).available, 0);
  console.log('19 -> final slot concurrency: PASS');

  console.log('--- TEST 3: reservation expiry ---');
  state = seed(19);
  const now = Date.now();
  // Create reservation that expires in 10 minutes (600,000 ms)
  const resExpiry = change(state, reserve('viso26-will-expire', { now, ttl: 600000 }));
  assert.equal(resExpiry.ok, true);
  assert.equal(change(state, { op: 'status', now }).available, 0);
  assert.equal(change(state, reserve('viso26-rejected', { now })).code, 'COUPON_BUSY');

  // Advance time past 10 minutes (now + 600001 ms)
  const later = now + 600001;
  const statusAfterExpiry = change(state, { op: 'status', now: later });
  assert.equal(statusAfterExpiry.held, 0, 'Expired reservation must no longer be held');
  assert.equal(statusAfterExpiry.available, 1, 'Capacity must be restored');

  // Next reservation is accepted
  const nextRes = change(state, reserve('viso26-accepted-after-expiry', { now: later }));
  assert.equal(nextRes.ok, true, 'Slot after expiry must be reservable');
  console.log('reservation expiry: PASS');

  console.log('--- TEST 4: failed payment ---');
  state = seed(18);
  assert.equal(change(state, reserve('viso26-pay-fail')).ok, true);
  assert.equal(change(state, { op: 'status' }).held, 1);
  // Release due to failed initialization
  const releaseFail = change(state, { op: 'release', reference: 'viso26-pay-fail', proof: 'initialization_definitively_rejected' });
  assert.equal(releaseFail.ok, true);
  assert.equal(change(state, { op: 'status' }).held, 0);
  // Commit after release fails
  assert.equal(change(state, commit('viso26-pay-fail')).code, 'LATE_PAYMENT');
  console.log('failed payment: PASS');

  console.log('--- TEST 5: duplicate confirmation ---');
  state = seed(19);
  assert.equal(change(state, reserve('viso26-dup-test')).ok, true);
  const firstCommit = change(state, commit('viso26-dup-test'));
  assert.equal(firstCommit.ok, true);
  assert.equal(firstCommit.duplicate, false);
  assert.equal(firstCommit.used, 20);

  // Repeat commit 10 times (simulating duplicate webhook callbacks + browser refreshes)
  for (let i = 0; i < 10; i++) {
    const dupCommit = change(state, commit('viso26-dup-test'));
    assert.equal(dupCommit.ok, true);
    assert.equal(dupCommit.duplicate, true);
    assert.equal(change(state, { op: 'status' }).used, 20, 'Redemptions must remain strictly 20');
  }
  console.log('duplicate confirmation: PASS');

  console.log('--- TEST 6: 20 -> exhausted ---');
  assert.equal(change(state, { op: 'status' }).used, 20);
  assert.equal(change(state, { op: 'status' }).available, 0);
  // Verify api/coupon-check behavior when exhausted
  couponLedger.setTransport(async (cmd) => change(state, cmd));
  const checkReq = { method: 'POST', headers: {}, body: { code: 'CATERSTUDIOS' } };
  let checkRes;
  const couponCheckHandler = require('./api/coupon-check.js');
  await couponCheckHandler(checkReq, {
    setHeader() {},
    statusCode: 200,
    end(s) { checkRes = { status: this.statusCode, data: JSON.parse(s) }; }
  });
  assert.equal(checkRes.status, 400);
  assert.equal(checkRes.data.valid, false);
  assert.equal(checkRes.data.code, 'COUPON_EXHAUSTED');
  console.log('20 -> exhausted: PASS');

  console.log('--- TEST 7: attempt #21 ---');
  // Attempt initialize payment with CATERSTUDIOS on exhausted ledger
  process.env.PAYSTACK_SECRET_KEY = 'sk_live_test_mock';
  process.env.FUNNEL_SESSION_SECRET = 'mock-secret-with-at-least-thirty-two-characters';
  process.env.PUBLIC_SITE_URL = 'https://www.visoritylive.com';

  const initPaymentHandler = require('./api/initialize-payment.js');
  let initRes;
  await initPaymentHandler(
    { method: 'POST', headers: {}, body: { name: 'Attempt 21', email: 'attempt21@example.com', coupon: 'CATERSTUDIOS' } },
    {
      setHeader() {},
      statusCode: 200,
      end(s) { initRes = { status: this.statusCode, data: JSON.parse(s) }; }
    }
  );
  assert.equal(initRes.status, 400);
  assert.equal(initRes.data.message, 'This coupon has been fully redeemed.');
  assert.equal(change(state, { op: 'status' }).used, 20, 'Attempt 21 must not change used count');
  console.log('attempt #21: PASS');

  console.log('--- TEST 8: coupon + manual transfer blocked ---');
  const funnelJs = fs.readFileSync('./assets/js/funnel.js', 'utf8');
  assert(funnelJs.includes("if(appliedCoupon){"), 'Must check appliedCoupon in manual-paid');
  assert(funnelJs.includes("This discount code is valid for online payment via Paystack only"), 'Must display restriction message');
  assert(funnelJs.includes("copyBtn.disabled=true"), 'Must disable copyBtn when coupon applied');
  assert(funnelJs.includes("manualBtn.disabled=true"), 'Must disable manualBtn when coupon applied');
  console.log('coupon + manual transfer blocked: PASS');

  console.log('--- TEST 9: normal full-price Paystack ---');
  // With ledger at 20 (exhausted), normal full-price checkout must continue working
  global.fetch = async (url, opts) => {
    if (String(url).includes('/transaction/initialize')) {
      const b = JSON.parse(opts.body);
      assert.equal(b.amount, 500000, 'Full price must be charged');
      assert.equal(b.metadata.couponCode, '', 'No coupon metadata');
      return { ok: true, json: async () => ({ status: true, data: { authorization_url: 'https://checkout.paystack.com/mock-full' } }) };
    }
    return { ok: true, json: async () => ({ status: true, data: {} }) };
  };
  let fullPriceInitRes;
  await initPaymentHandler(
    { method: 'POST', headers: {}, body: { name: 'Full Price User', email: 'fullprice@example.com' } },
    {
      setHeader() {},
      statusCode: 200,
      end(s) { fullPriceInitRes = { status: this.statusCode, data: JSON.parse(s) }; }
    }
  );
  assert.equal(fullPriceInitRes.status, 200);
  assert.equal(fullPriceInitRes.data.amount, 500000);
  assert.equal(fullPriceInitRes.data.url, 'https://checkout.paystack.com/mock-full');
  console.log('normal full-price Paystack: PASS');

  console.log('--- TEST 10: normal full-price manual transfer ---');
  assert(funnelJs.includes("amount=FULL"), 'Manual transfer defaults to FULL price');
  assert(funnelJs.includes("Amount: NGN ${amount.replace('₦','')}"), 'Manual message uses full price');
  assert(!funnelJs.includes("Discount code: ${appliedCoupon.code}"), 'Manual message never includes discount code');
  console.log('normal full-price manual transfer: PASS');

  console.log('\n========================================');
  console.log('ALL 10 VERIFICATION REQUIREMENTS PASSED');
  console.log('========================================');
})().catch(err => {
  console.error('QA FAILURE:', err);
  process.exitCode = 1;
});
