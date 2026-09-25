# Ambassador experience upgrade

**Goal:** Improve the local ambassador invitation and onboarding page while preserving the conference brand and payment flow.

**Audit:** Existing page repeats large headings and equal cards; generic share link is described as personal tracking. Existing colours are wine, cream, pink and yellow; local Bricolage/Instrument fonts, official logo, WhatsApp contact and analytics event names must remain. Existing referral storage is session-only and registration does not submit a code. No registry or durable attribution backend is present.

**Design:** Preserve mode. Variance 7, motion 4, density 3. Native CSS editorial hero with a dimensional branded credential, concise network introduction, four numbered benefits, onboarding steps and useful share tool. Reduce-motion fallback; responsive layout; no fabricated totals or earned status.

## Tasks
- [ ] Extract ambassador markup to scripts/ambassador-page.mjs; use a page-scoped stylesheet.
- [ ] Refine WhatsApp onboarding, standard canonical share link, copy feedback/fallback and reduced-motion interaction.
- [ ] Support the requested legacy ambassador anchor route without changing the homepage section design.
- [ ] Verify responsive layout, links, analytics, keyboard copying and clipboard fallback. Capture desktop/mobile previews.
- [ ] Resolve referral registry/storage with user before claiming server-validated 30-day attribution or automated rewards.

## Referral architecture pending configuration
Approved code registry must associate each opaque handle with an owner and active status. A server-issued first-touch signed cookie expires after 30 days without renewal; registration and verified charge records need separate idempotency keys, owner-email checks and explicit test exclusions. A generic ambassador share link is not personal credit. A durable atomic store or Apps Script locking/upsert is required before claiming accurate totals. No public attendee data or leaderboard will be exposed.
