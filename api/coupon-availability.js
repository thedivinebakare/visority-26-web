const coupons = require('../server/coupons.cjs');
const couponService = require('../server/coupon-service.cjs');
const { json, originAllowed, paystack, expectedDomain } = require('../server/payment.cjs');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return json(res, 405, { message: 'Use GET.' });
  }
  if (!originAllowed(req)) {
    return json(res, 403, { message: 'Invalid origin.' });
  }

  let code = 'CATERSTUDIOS';
  try {
    const url = new URL(req.url, 'http://localhost');
    const qCode = url.searchParams.get('code');
    if (qCode && typeof qCode === 'string') {
      code = qCode.toUpperCase().replace(/[\s_-]+/g, '');
    }
  } catch {}

  const rule = coupons.resolve(code);
  const label = rule?.label || 'Cater Studios';

  if (code !== couponService.CODE) {
    return json(res, 404, {ok: false, message: 'Coupon status is not available.'});
  }
  const availability = await couponService.currentState({
    paystack,
    expectedDomain: expectedDomain()
  });
  if (!availability.ok) {
    return json(res, 503, {
      ok: false,
      couponCode: code,
      label,
      message: availability.message || 'Could not check coupon availability.'
    });
  }

  return json(res, 200, {
    couponCode: availability.couponCode,
    label,
    max: availability.max,
    redeemed: availability.redeemed,
    reserved: availability.reserved,
    available: availability.available,
    exhausted: availability.exhausted,
    updatedAt: availability.updatedAt
  });
};
