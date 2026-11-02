const ledger = require('../server/coupon-ledger-client.cjs');
const service = require('../server/coupon-service.cjs');
const {paystack, expectedDomain} = require('../server/payment.cjs');

process.loadEnvFile('.env');
const apply = process.argv.includes('--apply');
const short = value => String(value).slice(0, 9) + '…' + String(value).slice(-4);

async function successfulPayments() {
  const found = [];
  for (let page = 1; page <= 100; page++) {
    const transactions = await paystack('/transaction?perPage=100&page=' + page);
    if (!Array.isArray(transactions) || !transactions.length) break;
    for (const transaction of transactions) {
      let metadata = transaction.metadata;
      if (typeof metadata === 'string') {
        try { metadata = JSON.parse(metadata); } catch { metadata = {}; }
      }
      transaction.metadata = metadata || {};
      if (service.isVerifiedCaterPayment(transaction, expectedDomain())) found.push(transaction);
    }
    if (transactions.length < 100) break;
  }
  return found;
}

(async () => {
  const state = await ledger.status(service.CODE);
  if (!state.ok) throw Error('Coupon ledger is unavailable: ' + state.code);
  const payments = await successfulPayments();
  const unique = new Map();
  const duplicates = [];
  for (const payment of payments) {
    if (unique.has(payment.reference)) duplicates.push(payment.reference);
    else unique.set(payment.reference, payment);
  }
  const entries = new Map((state.entries || []).map(entry => [entry.reference, entry]));
  const redeemed = new Set((state.entries || []).filter(entry => entry.status === 'redeemed').map(entry => entry.reference));
  const missing = [...unique.keys()].filter(reference => !redeemed.has(reference));
  const unexpected = [...redeemed].filter(reference => !unique.has(reference));
  const repaired = [];
  const failed = [];
  if (apply) {
    for (const reference of missing) {
      const payment = await paystack('/transaction/verify/' + encodeURIComponent(reference));
      const result = await service.commitVerified(payment, expectedDomain());
      if (result.ok) repaired.push(reference);
      else failed.push({reference, code: result.code});
    }
  }
  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'audit',
    paystackConfirmed: unique.size,
    ledgerRedeemed: redeemed.size,
    ledgerReserved: (state.entries || []).filter(entry => entry.status === 'reserved').length,
    matched: [...unique.keys()].filter(reference => redeemed.has(reference)).map(short),
    missingFromLedger: missing.map(short),
    unexpectedLedgerRecord: unexpected.map(short),
    duplicateReference: duplicates.map(short),
    repaired: repaired.map(short),
    failed: failed.map(item => ({reference: short(item.reference), code: item.code}))
  }, null, 2));
  if (failed.length || missing.some(reference => !entries.has(reference))) process.exitCode = 2;
})().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
