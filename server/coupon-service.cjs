const coupons = require('./coupons.cjs');
const ledger = require('./coupon-ledger-client.cjs');

const CODE = 'CATERSTUDIOS';
const SESSION_MS = 10 * 60 * 1000;

function isVerifiedCaterPayment(transaction, expectedDomain) {
  return transaction && transaction.status === 'success' &&
    transaction.domain === expectedDomain && transaction.currency === 'NGN' &&
    transaction.metadata?.event === 'visority26' &&
    String(transaction.metadata?.couponCode || '').toUpperCase().replace(/[\s_-]+/g, '') === CODE &&
    coupons.matchesCharge(transaction) && /^viso26-[a-z0-9-]+$/i.test(transaction.reference || '');
}

async function commitVerified(transaction, expectedDomain) {
  if (!isVerifiedCaterPayment(transaction, expectedDomain)) {
    return {ok: false, code: 'PAYMENT_NOT_ELIGIBLE'};
  }
  let result = await ledger.commit(CODE, transaction.reference);
  if (result.ok) return result;
  if (result.code !== 'LATE_PAYMENT') return result;
  const paidAt = Date.parse(transaction.paid_at || transaction.paidAt || '');
  if (!Number.isFinite(paidAt)) return {ok: false, code: 'PAYMENT_TIME_MISSING'};
  return ledger.reconcile(CODE, transaction.reference, paidAt);
}

function aggregate(state) {
  if (!state?.ok) return state;
  const max = Number.isInteger(state.maximum) ? state.maximum : 20;
  const redeemed = Number.isInteger(state.used) ? Math.max(0, state.used) : 0;
  const reserved = Number.isInteger(state.held) ? Math.max(0, state.held) : 0;
  return {
    ok: true,
    couponCode: CODE,
    max,
    redeemed,
    reserved,
    available: Math.max(0, Math.min(max, max - redeemed - reserved)),
    exhausted: redeemed + reserved >= max,
    updatedAt: new Date().toISOString()
  };
}

async function currentState({paystack, expectedDomain, reconcileExpired = true} = {}) {
  let state = await ledger.status(CODE);
  if (!state.ok || !reconcileExpired) return aggregate(state);
  const now = Date.now();
  const expired = (state.entries || []).filter(entry =>
    entry.status === 'reserved' && Number.isFinite(entry.expiresAt) && entry.expiresAt <= now
  );
  if (!expired.length) return aggregate(state);
  if (typeof paystack !== 'function' || typeof expectedDomain !== 'string') {
    return {ok: false, code: 'RECONCILIATION_REQUIRED'};
  }
  for (const entry of expired) {
    let transaction;
    try {
      transaction = await paystack('/transaction/verify/' + encodeURIComponent(entry.reference));
    } catch {
      return {ok: false, code: 'PAYMENT_VERIFY_UNAVAILABLE'};
    }
    if (isVerifiedCaterPayment(transaction, expectedDomain)) {
      const committed = await commitVerified(transaction, expectedDomain);
      if (!committed.ok) return committed;
    } else if (['abandoned', 'failed'].includes(transaction?.status)) {
      const released = await ledger.release(CODE, entry.reference, 'provider_irrevocably_expired');
      if (!released.ok && released.code !== 'ALREADY_REDEEMED') return released;
    }
  }
  state = await ledger.status(CODE);
  return aggregate(state);
}

module.exports = {CODE, SESSION_MS, isVerifiedCaterPayment, commitVerified, currentState, aggregate};
