const referrals = require('../server/referrals.cjs');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  if (!['GET', 'HEAD'].includes(req.method)) { res.statusCode = 405; res.end(); return; }
  const url = new URL(req.url, 'https://www.visoritylive.com');
  const code = req.query?.code || url.searchParams.get('code') || url.pathname.split('/').filter(Boolean)[0];
  try { await referrals.capture(req, res, code); } catch { /* The conference remains accessible. */ }
  res.statusCode = 302;
  res.setHeader('Location', '/');
  res.end();
};
