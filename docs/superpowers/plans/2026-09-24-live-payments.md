# Custom-domain Live Payments Implementation Plan

**Goal:** Activate verified Premium checkout on https://www.visoritylive.com without changing the approved design.

**Architecture:** Keep Paystack as the payment source of truth. Validate signed webhook bodies and server-side transaction details. Google Sheets records webhook notifications with at-least-once delivery; it is not an entitlement database. Access requires a signed browser session or an email plus a private transaction reference.

**Tech Stack:** Static HTML generator, Node.js Vercel functions, Paystack, Google Apps Script.

## Constraints
- Never publish credentials or grant Premium access for test payments.
- Canonical callback: https://www.visoritylive.com/vip/thank-you/.
- Price: 500000 kobo, NGN. Preserve manual payment to Kuda / Victor Maji / 2015946586.
- Preserve existing unrelated work. Do not complete a real charge during QA.

## Execution
- [x] Harden server/payment.cjs: exact signatures, bounded raw bodies, shared allowed origins and charge validation.
- [x] Update initialization/config APIs: canonical callback, valid config only, both explicit custom-domain origins.
- [x] Harden webhook: disable body parsing, verify signature and provider transaction, retry unsuccessful Sheets saves. Do not use process memory as durable deduplication.
- [x] Require reference plus matching email for recovery; never unlock Premium on a test payment. Update recovery form requirements.
- [x] Run mocked payment/webhook tests including rejection and retry paths, then regenerate static output.
- [x] After user replaces exposed Paystack key, rotate session secret privately and update production environment.
- [x] Deploy and verify HTTPS, public payment config, unsigned webhook rejection and checkout routes. User completes dashboard webhook setup and any real charge.

## Operational limits
Sheets may receive duplicate notifications after delivery retries. Reconcile by Paystack reference; exactly-once recording requires an atomic backend upsert. No automatic email fulfilment is claimed.

## Current verification
Both custom domains respond over HTTPS; the root redirects to www. Build, qa-payment.mjs and qa-live-payment.cjs pass. User confirmed replacement key; Paystack accepted it. Production environment updated and deployment dpl_HxkQrZ9bEsPAhoXrE5qRLvUYpUgm is READY on www.visoritylive.com. Vercel webhook uses the Web Request adapter api/paystack-webhook.mjs to preserve raw bytes. Live checks passed for config, checkout/welcome/recovery routes, signed harmless webhook and unsigned rejection, access enforcement, cross-origin rejection, and private environment 404. No real charge completed. Paystack dashboard webhook setting remains user-managed and has not been independently verified.
