# Local funnel build — activation notes

Approved homepage is unchanged. Preview: http://localhost:3001/access/standard-confirmation/ and /checkout/vip/ . Names come from the existing browser registration record; a new visitor gets generic copy. Personalisation is never payment authorization.

Implemented: live registration ticket, named Standard welcome, actual Standard WhatsApp link, Google Calendar day links and three-event ICS, Premium upsell, prefilled checkout, server-side Paystack initialization/verification, signed HttpOnly order cookie, test-mode isolation, manual transfer account presentation/copy and prefilled WhatsApp handoff, protected Premium WhatsApp destination returned only after verified live payment.

The supplied Kuda / Vee Maji / 2015946586 account is a placeholder. Copy/transfer declaration are disabled by default. User must confirm actual details before MANUAL_PAYMENTS_ENABLED=true. The WhatsApp action opens a message only; the attendee must send it. Manual approval and group invitation currently happen through the team, not a fabricated automatic confirmation.

Private deployment settings: PAYSTACK_SECRET_KEY; FUNNEL_SESSION_SECRET (random 32-byte or stronger secret); PUBLIC_SITE_URL (exact canonical origin); PAYSTACK_INTERNATIONAL_ENABLED=true only after approval; TRANSFER_BANK; TRANSFER_HOLDER; TRANSFER_NUMBER; MANUAL_PAYMENTS_ENABLED=true only when real; PREMIUM_COMMUNITY_URL. Never put secrets in public assets. No credentials have been configured or payment taken.

Paystack international cards can use the same checkout once enabled; no second gateway account was provided. Provider-hosted checkout supplies available methods. With no gateway credentials the page clearly says payments are opening soon. No fake payment controls are offered to visitors.

Remaining production foundations: durable order/attendee store, signed webhooks with idempotent fulfilment, transactional email and cross-device recovery, acknowledged registration transport, manual approval ledger, rate limits. Existing no-cors registration remains honestly “sent”, not confirmed. The current payment adapter re-verifies with Paystack on every access and supports same-browser return via an expiring signed cookie; it does not claim to deliver email or cross-device recovery. These foundations must be completed before enabling production payments. Provider credentials alone are not production readiness.

Tests: node qa-funnel.mjs (browser preview on port 3001); node qa-payment.mjs (mocked verification, no real gateway transactions). The older qa-flows suite still checks the old payment-placeholder copy and will need updated expectations as the broader backend is integrated.
