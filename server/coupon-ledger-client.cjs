const crypto = require('node:crypto');

const PROTOCOL = 'visority-coupon-ledger-v1';
const DEFAULT_COUPON = 'CATERSTUDIOS';
const DEFAULT_MAX = 20;

function getEndpoint() {
  return process.env.COUPON_LEDGER_URL || process.env.CLIRA_SHEETS_URL;
}

function getSecret() {
  return process.env.COUPON_LEDGER_SECRET || process.env.CLIRA_ACCESS_KEY;
}

let customTransport = null;

function setTransport(fn) {
  customTransport = fn;
}

async function executeCommand(command) {
  if (customTransport) {
    return customTransport(command);
  }

  const endpoint = getEndpoint();
  const secret = getSecret();
  if (!endpoint || !secret) {
    return { ok: false, code: 'LEDGER_NOT_CONFIGURED', message: 'Coupon ledger is not configured.' };
  }

  const at = Date.now();
  const id = 'viso26-ledger-' + crypto.randomUUID();
  const payload = JSON.stringify({
    protocol: PROTOCOL,
    coupon: command.coupon || DEFAULT_COUPON,
    maximum: command.maximum || DEFAULT_MAX,
    at,
    id,
    ...command
  });

  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  const envelope = {
    action: 'couponLedger',
    payload,
    signature
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Clira-Key': secret
      },
      body: JSON.stringify(envelope),
      signal: AbortSignal.timeout(10000),
      redirect: 'follow'
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return { ok: false, code: 'LEDGER_UNAVAILABLE', message: 'Invalid response from coupon ledger.' };
    }

    if (!res.ok || !data.ok) {
      return {
        ok: false,
        code: data.code || 'LEDGER_REJECTED',
        error: data.error,
        status: data.status,
        available: data.available,
        used: data.used,
        held: data.held
      };
    }

    return data;
  } catch (err) {
    return { ok: false, code: 'LEDGER_UNAVAILABLE', message: err.message };
  }
}

async function status(coupon = DEFAULT_COUPON) {
  return executeCommand({ op: 'status', coupon });
}

async function reserve(coupon = DEFAULT_COUPON, reference, ttl) {
  return executeCommand({ op: 'reserve', coupon, reference, ttl });
}

async function commit(coupon = DEFAULT_COUPON, reference) {
  return executeCommand({ op: 'commit', coupon, reference });
}

async function release(coupon = DEFAULT_COUPON, reference, proof) {
  return executeCommand({ op: 'release', coupon, reference, proof });
}

module.exports = {
  executeCommand,
  status,
  reserve,
  commit,
  release,
  setTransport,
  PROTOCOL,
  DEFAULT_COUPON,
  DEFAULT_MAX
};
