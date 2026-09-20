# Visority ’26: Optimised Funnel Architecture

Status: architecture proposal for review. No application code or live pages changed.
Scope: Phase 3 onward. Preserve the approved homepage, official brand, palette, speaker presentation and existing registration fields. The draft's purple redesign and Framer Motion migration are outside this work.

## Core decision

One attendee record, one current access state, one primary next action per screen. Standard and Premium are access levels on the same attendee record. Choosing Premium is purchase intent, not proof of entitlement. Use Premium in visitor-facing copy; retain vip only where existing routes and integrations require it.

## Pathways

| Entry | Next steps | Primary destination |
|---|---|---|
| Standard registration | Save and acknowledge registration → Standard welcome | Join the main community |
| Premium registration | Save and acknowledge registration → checkout → verify payment | Premium welcome |
| Standard upgrade | Reuse attendee details → checkout → verify payment | Same attendee, upgraded access |
| Returning attendee | Recover access by emailed secure link | Appropriate welcome page |
| Payment closed or declined | Keep registration and answers → retry or continue free | Checkout or Standard welcome |
| Payment pending | Explain pending status → check status without another charge | Verified Premium welcome when settled |
| Media/ecosystem/resource partner | Short enquiry → receipt → relevant next step | Partnership follow-up |
| Corporate sponsor | Read prospectus → book a conversation or contact sponsor lead | Sponsor conversation |
| Ambassador applicant | Short application → acknowledgement → approval if required | Ambassador onboarding after approval |

## Phase 3: Standard welcome

Retain /access/standard-confirmation/. For an acknowledged registration, display “You’re in. Let’s get you ready.” and a quiet “Standard · Free” badge. Show dates, online format and 8–10pm WAT immediately.

1. Primary: Join the Visority community. Explain what happens there: announcements and joining instructions. Do not make WhatsApp membership the only way to receive essential access details; transactional email is the fallback.
2. Secondary: Add the three nights to your calendar. Offer Google Calendar options for each night and one .ics containing all three events. Do not promise silent calendar syncing: the attendee confirms the event in their calendar app. Use stable event identifiers across homepage and confirmation downloads to reduce duplicates. Store 19:00–21:00 UTC, equivalent to 20:00–22:00 WAT on Oct 28–30, 2026.
3. Tertiary: An understated upgrade panel after onboarding actions. Headline “Keep the experience going.” Show the actual incremental benefits, ₦5,000 total, and “Upgrade to Premium”. Never send an existing attendee back through the six-step form.

No second success interstitial between registration and this page. Announce successful submission and navigate directly, with a visible fallback link if navigation fails. A visitor without a valid session gets “Already registered? Retrieve your access” and “Register free”, not a false confirmation.

Community clicks and calendar downloads are actions, not proof of joining or attendance. Do not display fabricated completion ticks. A community join may be verified only by a supported platform integration.

## Phase 4: Premium checkout and onboarding

Retain /checkout/vip/ and /vip/thank-you/. Display Premium throughout.

Checkout contains one concise order summary, existing attendee name/email, an accessible correction path, confirmed benefits, final total and one “Pay ₦5,000 securely” action. Stack summary above payment on mobile. Do not add an account/password requirement, a second questionnaire, coupon field without a real promotion, or competing payment-provider buttons.

Proposed default: one Paystack checkout integration, subject to the organiser's active merchant account. Use provider-hosted checkout with a return route for a dependable mobile handoff. An inline launch may be added only if it preserves the same hosted fallback. Never collect card details in our own form. Show all mandatory fees before payment; confirm the fee policy before launch.

Keep current published benefits authoritative: live sessions, networking, recordings and notes, Premium community, priority Q&A, resource vault and identity tag. The draft's mastermind access/live Q&A/resource kits need an explicit fulfilment decision before being advertised as additional promises.

State handling:
- Pending: “We’re checking your payment. Please don’t pay again.” Offer status refresh and support; after a bounded wait stop automatic polling and explain that the access email will follow when confirmed.
- Cancelled/declined: “Your registration is saved. You can try again or continue with Standard.” Preserve attribution and identity.
- Verified: Upgrade the existing record once; navigate directly to Premium welcome.
- Returning paid attendee: Show “Open your Premium access”, not another charge button.
- Unknown reference/wrong account: Do not unlock access or reveal another attendee's details. Offer recovery/support.
- Provider payment succeeds but browser closes: Verified webhook still fulfils the order and queues the access email.
- Duplicate callback/webhook: One entitlement, one receipt, no duplicate rows or kit issuance.
- Refund/dispute: Record separately, apply the agreed entitlement policy, and flag manual review where community removal needs a human.

Premium welcome: “Your Premium access is ready.” Show receipt status, then one primary “Join the Premium community” action. Calendar and resource access follow. Display an honest availability date/message for unreleased recordings and kits rather than empty download buttons. Deliver an emailed secure return link so closing the browser does not lose access.

Community access: start with a private, verified access page plus administrator-approved joining if WhatsApp is selected. Do not describe a reusable group URL as single-use. An application token consumed once does not make the revealed external URL single-use. If stricter automation is needed and Telegram is acceptable, link the verified attendee to a Telegram identity and approve that identity's join request with an administrator bot. Member limits alone do not prove identity or guarantee one-time use. This choice is a launch dependency, not a reason to make attendees join both apps.

## Phase 5: Partnerships and sponsors

Keep /partners/ and the existing page styling. Use the selected partnership card to prefill the existing inline form instead of introducing a modal. Required: organisation, contact name, contact email or WhatsApp, partnership type. Optional: reach and short note. Submit into the dedicated Partnerships destination with an acknowledged receipt.

After submission, show “Your enquiry is with the team” only after it is stored. Explain the next step and a response window only if the team commits to one. Preserve input on network errors and provide one retry action.

Corporate sponsorship is a distinct path on the same route: ungated official prospectus download, a primary “Discuss sponsorship” booking link, and a secondary prefilled corporate WhatsApp link. Do not require a form submission before reading the PDF or booking. Keep a short enquiry alternative for visitors who cannot book. Do not call a calendar-link click a completed booking; track completion only when verified by the booking service.

If an external PDF/calendar/link is absent, suppress that action and show a real contact route. Do not publish placeholder files, numbers or schedules. Maintain a downloadable accessible PDF and a clear on-page summary of the offer.

## Ambassador pathway (parallel, not a mandatory registration step)

Keep /ambassadors/ prominent and independent of paid access. Default proposal: application-led programme, with final approval rules supplied by the organiser. Capture name, email/WhatsApp, community/platform and one short motivation field; reuse attendee details when available. No mandatory follower-count threshold unless the organiser requires it.

Acknowledge the application without declaring acceptance. After approval, provide programme guidance, approved share assets, a support/community route and a server-issued referral code. An ordinary attendee can share the event without being represented as an approved ambassador. Do not invent commission, certificates or rewards.

Referral attribution: retain the first valid ambassador code for a proposed 30-day window, including through an upgrade and hosted payment. Record last campaign touch separately. Validate codes server-side, exclude self-referrals and test traffic, and count distinct confirmed registrations separately from verified Premium purchases. Approval needed for attribution window, reward rules and any payout obligations. Never expose attendee personal data in a public leaderboard.

## Minimum reliability bridge (no Phase 1–2 visual redesign)

Current inspection: assets/js/registration.js uses a no-cors Apps Script POST; an opaque response cannot prove the sheet stored the lead. The current UI correctly says “Registration sent.” The local Apps Script appends rows and does not implement deduplication. Checkout and Premium confirmation are honest placeholders. Confirmation already offers a three-event .ics download. Partner capture exists; ambassadors currently have a share link and email enquiry.

Add a same-origin registration endpoint that validates the existing payload and returns an acknowledged, idempotent registration ID and resumable attendee session. Preserve the form fields, selectedTier compatibility and Others values. This narrow transport change is necessary to support truthful Phase 3 confirmation. The server can mirror records into the existing Sheet; durable attendee/payment state needs a store supporting unique keys and atomic updates. The Sheet remains the team's reporting view, not the sole payment-entitlement ledger. Choose storage with the owner before provisioning.

Minimal records: attendee ID + event ID + normalised email; registration status; requested tier; actual entitlement; order ID/reference/expected total/currency/payment state; ambassador attribution; onboarding actions; timestamps. Separate identity, payment and application states. Use unique constraints for event/email, payment reference and fulfilled order. Protect recovery responses from email enumeration. Rate-limit token sending and API writes. Use short-lived hashed recovery tokens, secure HttpOnly session cookies and server-side identity checks. Do not put email, phone, access tokens or payment secrets into analytics, page URLs or public static HTML. Redact tokens and payment secrets from logs; keep private access responses non-cacheable. Store only what is needed and provide a retention/deletion policy.

Payment initialization calculates ₦5,000 = 500000 kobo server-side. Verification checks provider success, reference, expected amount, NGN currency, merchant environment and the order-attendee mapping. Signed webhook validation and server verification converge on the same idempotent fulfilment function. Browser query parameters and localStorage cannot grant Premium access. A delayed Sheet sync or email delivery must not undo a valid paid entitlement; queue and retry those side effects independently.

## Communications and measurement

Transactional sequence: acknowledged registration/access email; verified Premium receipt and onboarding email when applicable; agreed event reminders; post-event resource availability notice. Do not send both a Standard welcome campaign and Premium welcome campaign on successful direct Premium purchase. Offer access recovery without a password. Keep optional marketing consent distinct. Payment recovery reminders, if adopted, must be limited and suitable for the user's communication permissions.

Record: registration acknowledged, welcome viewed, community link clicked, calendar action, upgrade clicked, checkout initialized, payment verified, Premium welcome viewed, resource downloaded, partner enquiry acknowledged, prospectus downloaded, booking verified, ambassador application acknowledged, ambassador approved and attributed conversion. Server events determine registration/payment conversions; client clicks measure intent. No personal answers in analytics. Report Standard activation, checkout completion, upgrade conversion and partner/sponsor progression separately.

## Implementation sequence after architecture approval

1. Reliability bridge: keep registration UI intact; add acknowledged persistence, deduplication, sessions and recovery. Deliverable: one registration despite double-click, retry or dropped response.
2. Standard onboarding: integrate community/calendar/upgrade and transactional access email. Deliverable: confirmed attendee reaches one clear next step and can return on another device.
3. Premium: integrate one provider in test mode, verify payment, fulfil exactly once, secure onboarding/resources and recover abandoned browser sessions. Deliverable: no unpaid access and no duplicate payment request for a paid order.
4. Partnerships/sponsorship: connect real prospectus and contact destinations, acknowledge enquiries, verify booking where available.
5. Ambassador programme: implement agreed approval and attribution rules; release share assets only with truthful programme status.
6. Regression/release: review locally and on a preview deployment, then request production release approval for this future work. Preserve the current live deployment and local Git restore point fbf00c4.

Anticipated code boundaries: new funnel renderer scripts/funnel-pages.mjs called by scripts/build-pages.mjs; new narrowly scoped assets/css/funnel.css; existing assets/js/registration.js transport only; confirmation.js and new checkout/access scripts; api handlers for registration, recovery, payment initialization/verification/webhook and partner/ambassador applications; server-only shared persistence/payment/entitlement modules. Leave scripts/homepage.mjs, shared brand styles and homepage interactions unchanged. Final endpoint and storage contracts belong in the implementation plan once provider choices are supplied.

Acceptance scenarios: mobile keyboard and errors; unchanged homepage screenshot; Others payload preserved; repeat email and submission retry; direct route without session; email recovery after closing browser; Standard upgrade without form repetition; cancelled/declined/pending payment; forged reference; wrong amount/currency; signature failure; duplicate/reordered webhooks; callback missing; resource entitlement checks; calendar dates in another timezone; expired/forwarded invite token; referral retained across gateway; partner store failure and retry; analytics without personal data. Use payment sandbox only until explicit production readiness. Do not send real applications, emails or payments during automated QA.

## Inputs needed before integration

- Active payment provider and merchant account; confirm ₦5,000 final total and fee/refund policy. Configure secrets privately in hosting settings, never paste them into this document.
- Main community URL; Premium community platform and admission rules.
- Exact Premium fulfilment list and availability dates, including any mastermind promise.
- Official sponsorship PDF, booking URL or corporate contact number, and committed response window.
- Ambassador application/approval rules, actual benefits, referral policy and programme assets.
- Sending domain/service for transactional email and approved persistent storage.

## Source checks

Paystack recommends server confirmation and webhooks before delivering value: https://paystack.com/docs/payments/accept-payments/
Webhook authenticity: https://paystack.com/docs/payments/webhooks/
Transaction initialization/verification and subunit amounts: https://paystack.com/docs/api/transaction/
Telegram invite and join-request capabilities: https://core.telegram.org/bots/api#createchatinvitelink
