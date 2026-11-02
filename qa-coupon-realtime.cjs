const assert = require('node:assert/strict');
const ledger = require('./server/coupon-ledger-client.cjs');
const service = require('./server/coupon-service.cjs');
const {couponTransition} = require('./server/coupon-state.cjs');

const now = Date.now();
const reference = 'viso26-realtime-expired';
const state = {maximum: 20, entries: [
  {reference, status: 'reserved', createdAt: now - 700000, expiresAt: now - 100000}
]};
ledger.setTransport(async command => couponTransition(state, {...command, now}));

(async () => {
  let verifyStatus = 'success';
  const paystack = async () => ({
    status: verifyStatus,
    reference,
    amount: 250000,
    currency: 'NGN',
    domain: 'live',
    paid_at: new Date(now - 200000).toISOString(),
    metadata: {event: 'visority26', couponCode: 'CATERSTUDIOS'}
  });
  let result = await service.currentState({paystack, expectedDomain: 'live'});
  assert.equal(result.redeemed, 1);
  assert.equal(result.reserved, 0);
  assert.equal(result.available, 19);

  result = await service.currentState({paystack, expectedDomain: 'live'});
  assert.equal(result.redeemed, 1, 'Repeated status must not double count');

  const second = 'viso26-realtime-abandoned';
  state.entries.push({reference: second, status: 'reserved', createdAt: now - 700000, expiresAt: now - 100000});
  verifyStatus = 'abandoned';
  const abandonedPaystack = async path => ({status: 'abandoned', reference: second});
  result = await service.currentState({paystack: abandonedPaystack, expectedDomain: 'live'});
  assert.equal(result.redeemed, 1);
  assert.equal(result.reserved, 0);
  assert.equal(result.available, 19);

  const third = 'viso26-realtime-ongoing';
  state.entries.push({reference: third, status: 'reserved', createdAt: now - 700000, expiresAt: now - 100000});
  const ongoingPaystack = async () => ({status: 'ongoing', reference: third});
  result = await service.currentState({paystack: ongoingPaystack, expectedDomain: 'live'});
  assert.equal(result.reserved, 1, 'Ongoing payment must fail closed and remain held');
  assert.equal(result.available, 18);

  ledger.setTransport(null);
  console.log('PASS real-time resolver: verified expiry commits, duplicates stay idempotent, abandoned releases, ongoing remains held.');
})().catch(error => {
  ledger.setTransport(null);
  console.error(error);
  process.exitCode = 1;
});
