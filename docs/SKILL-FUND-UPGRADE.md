# Skill Fund upgrade

Homepage primary CTA now opens /skill-fund/. Dedicated page preserves the conference palette, adds a dimensional doorway hero, practical support categories, separate applicant/partner paths, private-code checkout guidance and FAQs. The partner link preselects Skill Fund Partner. Applicants reach the existing admin with an editable WhatsApp introduction.

The partner code is no longer rendered in public HTML, JavaScript or the Skill Fund page. The server still resolves it for users who supply it. It is a shared private code, not an identity-bound entitlement or single-use voucher.

Checkout fix: a pending full-price Paystack link cannot be reused after applying a discount. Provider verification requires the discounted amount to match valid coupon metadata, not merely an amount allowlist. UI prevents proceeding while coupon validation is pending.

Verification: coupon/payment mocked tests cover half-price initialization, stale-link replacement, invalid codes, altered prices and discounted access. Actual Paystack initialization returned an unpaid NGN 2,500 transaction with coupon metadata; no charge was completed. The probe used the conference contact email and name Visority QA Checkout Check.

This upgrade is local until deployed. Browser tests passed for homepage, Skill Fund and checkout at 1440px, 768px, 390px and 320px, with no horizontal overflow or browser errors. Coupon apply/remove was checked against the local endpoint. Desktop/mobile screenshots were visually reviewed.
