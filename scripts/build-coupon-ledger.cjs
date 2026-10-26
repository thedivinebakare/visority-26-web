const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const content = '// Generated: node scripts/build-coupon-ledger.cjs\n' +
  fs.readFileSync(path.join(root, 'server/coupon-state.cjs'), 'utf8') + '\n' +
  fs.readFileSync(path.join(root, 'scripts/coupon-ledger-apps-script.js'), 'utf8');
fs.writeFileSync(path.join(root, 'docs/CouponLedger.gs'), content);
console.log('Generated docs/CouponLedger.gs');
