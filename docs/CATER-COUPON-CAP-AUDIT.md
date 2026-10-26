# CATERSTUDIOS lifetime-cap audit — 2026-10-26

Status: investigated; application unchanged; not deployed.

## Existing implementation
- Existing code: CATERSTUDIOS (server/coupons.cjs).
- Existing discount: 50%; NGN 2,500 against NGN 5,000 full price.
- No provider coupon identifier: application resolves the discount and initializes a Paystack transaction at the reduced amount.
- No durable atomic coupon ledger currently exists.
- Manual-transfer WhatsApp messages currently also accept the applied discount, without authoritative automated redemption recording.

## Read-only Paystack audit
- 11 live transactions scanned across one page.
- CATERSTUDIOS: 0 successful transactions, 2 abandoned transactions.
- No unexpected successful coupon amounts.
- This is not proof of zero lifetime redemptions: manually confirmed transfers must be reconciled separately.
- Remaining capacity is 20 minus confirmed lifetime redemptions; do not seed production until manual history is established and the provider audit is refreshed.

## Blocking correctness conditions
1. Establish historical manual discounted redemptions and whether this coupon may be limited to online checkout. Ordinary full-price manual transfers can remain unchanged.
2. Establish a provider-enforced way to irrevocably expire/cancel discounted sessions before releasing reservations. Paystack's documented abandoned status means the customer has not completed payment; it does not establish irrevocable expiry. A local TTL alone cannot guarantee no late discounted payment.
3. The two previously issued abandoned discounted transactions must also be reconciled or demonstrably invalidated.
4. Any Google Apps Script ledger change requires deployment to the actual active connector, not merely editing the local .gs file.

## Conditional implementation once resolved
- Preserve existing code and discount; centralize lifetime maximum at 20.
- Use existing Google Sheets backend with Apps Script LockService for atomic reservation/commit, authenticated server-to-server requests, and unique Paystack references.
- Reserve before issuing a discounted checkout; outstanding payable sessions occupy capacity.
- Commit only after authoritative verification of live success, reference, currency, amount and coupon metadata.
- Deduplicate webhook and verification commits by transaction reference.
- Release only when the provider establishes that payment can no longer complete. Never release solely because a browser closed, a local TTL elapsed, or status is abandoned.
- Fail closed for discount lookup/initialization when ledger unavailable; preserve full-price checkout.
- Add only existing inline exhausted/error states; no public counter or unrelated UI changes.

## Required verification — NOT RUN / NOT IMPLEMENTED
19-to-20, 21st rejection, concurrent last slot through server, failed/expired session release, delayed old-session payment, duplicate callback, repeated success verification, full-price checkout, and client price tampering.

## Official references
https://paystack.com/docs/api/transaction/
https://paystack.com/docs/payments/verify-payments/

Do not deploy a success-counter-only or TTL-only workaround: it does not satisfy the requested guarantee.
