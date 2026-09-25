# Ambassador tracking setup

WhatsApp approval remains with Vee Maji: +2349037889885. Personal codes are created by the team, never self-issued on the public page.

1. Create a private Google Sheet. Open Extensions > Apps Script. Paste `ReferralTracking.gs` from this folder into that sheet's script project. Do not replace the existing registration or partner scripts.
2. Run `setupReferralSheets` once and grant access. It creates Ambassadors and ReferralEvents tabs.
3. Add a long random private value under Apps Script Project Settings > Script Properties named `REFERRAL_SHARED_SECRET`. Keep it out of cells and client-side code.
4. Deploy as a Web App, executing as the sheet owner, with access for Anyone. Requests are authenticated by the server-held shared secret. Copy its `/exec` URL.
5. Add `REFERRAL_SHEETS_WEBHOOK_URL` and the matching `REFERRAL_SHARED_SECRET` to local `.env` and Vercel production environment. Redeploy after setting them. No tracking requests are sent until both are configured.
6. For each approved ambassador, fill Ambassadors columns A–D: Code, Name, OwnerEmail, Status (`active`). Use a unique lowercase code of 3–40 letters, digits, underscores or hyphens, starting with a letter/digit. Do not use `ambassador`, `test`, or `preview`. Keep the OwnerEmail accurate to exclude self-referrals.
7. Send the ambassador `https://www.visoritylive.com/?ref=their-code` through the existing onboarding process. The public share tool remains generic and earns no personal credit.

## Counting rules
The first approved referral is stored in a signed HttpOnly cookie for 30 days, without extending its expiry on return visits. Registrations count only after the existing registration endpoint acknowledges a save. Premium counts only after the signed Paystack webhook and provider verification accept a live NGN 5,000 charge. Tests and self-referrals do not count. No cookie is an entitlement to free or paid access; the team handles ambassador benefits separately.

Registration is deduplicated by a keyed email hash; Premium by transaction reference. Apps Script locks protect duplicate deliveries. Owner emails stay in the private registry; attendee emails are hashed in the event ledger. Neither names nor attendee emails appear in public referral URLs or analytics events.

If registration tracking is temporarily unavailable, registration still succeeds and its original row contains `Ambassador reference: code` in the note for reconciliation. Premium tracking failures return a retryable webhook response. Existing payment audit rows may repeat, but the referral ledger deduplicates references. No cross-device attribution or automated benefit issuance is claimed.

## Acceptance checks before activation
Use a private test registry and a non-production key/endpoint to check duplicate delivery, inactive/unknown codes, self-referrals, and expiry. Confirm counts appear in the real sheet after one authorised registration. A real paid purchase is needed to validate end-to-end live Premium accounting; do not use a test charge as proof of live accounting.
