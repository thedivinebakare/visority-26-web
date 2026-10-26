// Pure ledger transition shared with the Google Apps Script deployment bundle.
// The caller MUST hold the durable backend lock across read/transition/write.
// Prices and coupon identity remain in coupons.cjs; this module adds no coupon.
function couponTransition(state, command) {
  if (!state || !Number.isInteger(state.maximum) || state.maximum < 1 ||
      !Array.isArray(state.entries)) throw Error('Invalid coupon ledger');
  var entries = state.entries;
  var seen = {};
  entries.forEach(function (entry) {
    if (!entry || typeof entry.reference !== 'string' || seen[entry.reference] ||
        ['reserved', 'redeemed', 'released'].indexOf(entry.status) < 0) {
      throw Error('Invalid coupon ledger entry');
    }
    seen[entry.reference] = true;
  });

  // Auto-expire reservations whose TTL has passed (Paystack session timeout = 10 mins)
  var now = Number.isFinite(command.now) ? command.now : Date.now();
  entries.forEach(function (e) {
    if (e.status === 'reserved' && Number.isFinite(e.expiresAt) && now >= e.expiresAt) {
      e.status = 'released';
      e.releasedAt = now;
      e.releaseReason = 'provider_session_timeout';
    }
  });

  var used = entries.filter(function (e) { return e.status === 'redeemed'; }).length;
  var held = entries.filter(function (e) { return e.status === 'reserved'; }).length;
  function result(extra) {
    return Object.assign({used: used, held: held, maximum: state.maximum,
      available: Math.max(0, state.maximum - used - held)}, extra);
  }
  // Preserve history even if a pre-rollout audit discovers over-cap usage.
  if (command.op === 'status') return result({ok: true, entries: entries});
  if (!/^viso26-[a-z0-9-]{1,100}$/i.test(command.reference || '')) {
    throw Error('Invalid payment reference');
  }
  var entry = entries.find(function (e) { return e.reference === command.reference; });
  if (command.op === 'reserve') {
    if (entry) return result({ok: entry.status === 'reserved', status: entry.status,
      code: entry.status === 'released' ? 'REFERENCE_RELEASED' : 'REFERENCE_EXISTS'});
    if (used >= state.maximum) return result({ok: false, code: 'COUPON_EXHAUSTED'});
    if (used + held >= state.maximum) return result({ok: false, code: 'COUPON_BUSY'});
    var ttl = Number.isFinite(command.ttl) ? command.ttl : 10 * 60 * 1000;
    var newEntry = {
      reference: command.reference,
      status: 'reserved',
      createdAt: now,
      expiresAt: now + ttl
    };
    entries.push(newEntry);
    held++;
    return result({ok: true, status: 'reserved', expiresAt: newEntry.expiresAt});
  }
  if (!entry) return result({ok: false, code: 'REFERENCE_UNKNOWN'});
  if (command.op === 'commit') {
    if (entry.status === 'redeemed') return result({ok: true, duplicate: true});
    // Never silently conceal an unsafe release or accept an unreserved payment.
    if (entry.status !== 'reserved') return result({ok: false, code: 'LATE_PAYMENT'});
    entry.status = 'redeemed';
    entry.redeemedAt = now;
    used++; held--;
    return result({ok: true, duplicate: false});
  }
  if (command.op === 'release') {
    // Trusted server proof required; 'abandoned' and local expiry are NOT proof.
    if (command.proof !== 'provider_irrevocably_expired' &&
        command.proof !== 'initialization_definitively_rejected') {
      return result({ok: false, code: 'RELEASE_UNPROVEN'});
    }
    if (entry.status === 'redeemed') return result({ok: false, code: 'ALREADY_REDEEMED'});
    if (entry.status === 'released') return result({ok: true, duplicate: true});
    entry.status = 'released';
    entry.releasedAt = now;
    entry.releaseProof = command.proof;
    held--;
    return result({ok: true, duplicate: false});
  }
  throw Error('Invalid coupon operation');
}
if (typeof module !== 'undefined') module.exports = {couponTransition};
