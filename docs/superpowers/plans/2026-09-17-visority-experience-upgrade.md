# Visority '26 Experience Upgrade Implementation Plan

**Status:** Proposed for confirmation. Planning only; no website changes or deployment authorized by this document alone.

**Goal:** Rebuild Visority as a distinctive African creative conference experience that takes visitors from understanding the event to choosing a pass and registering.

**Architecture:** Retain the working static HTML, CSS and JavaScript site. Keep the homepage as one structured document, add dedicated registration, partner and ambassador pages, and share a small stylesheet and narrowly scoped scripts between pages. Preserve existing checkout and confirmation URLs and data contracts; do not introduce a React migration.

**Tech stack:** Static HTML; existing Tailwind utilities; CSS custom properties; browser JavaScript; Node local server; Puppeteer screenshot/QA tooling; Vercel hosting. No additional animation framework is required.

**Execution:** Work through the checkboxes in this task after the user confirms this plan. Review each phase locally. Do not require unavailable execution skills or separate agents to carry out the plan.

## 1. Verified baseline and implications

- The repository is linked to GitHub `thedivinebakare/visority-26-web` and the Vercel project `visority-26-web`. Hosting authentication, production branch and the exact live revision remain unverified.
- The inspected working tree was clean, with latest commit `de4cd75`, adding Enter-key advancement to registration.
- `index.html` contains the homepage, styles, registration, partner modal and interaction scripts. It already uses orange/wine with Erica One and Plus Jakarta Sans. This is a composition and journey rebuild, not simply a purple-to-orange recolour.
- About and Tracks overlap. Partnerships and ambassadors precede registration; registration precedes pricing. These structures match the problems described in the supplied brief.
- Existing routes are `/checkout/vip/`, `/access/standard-confirmation/` and `/vip/thank-you/`.
- Google Sheets endpoints are configured. The current helper sends the same lead twice, using opaque `no-cors` requests; it cannot prove that a row was saved. The checked-in Apps Script appends each request without deduplication.
- Checkout can simulate success in sandbox mode. Premium confirmation trusts URL/browser data rather than a verified server response. Community URLs are placeholders. These are existing release-readiness issues, not features to conceal during the redesign.
- The partnership prospectus link references a PDF not present in the file inventory.
- Three real speaker portraits, stage imagery and local fonts exist. Authentic 2024 archive material and the new poster mentioned in the brief were not found.
- Older copy lists Premium at N7,000. The current site and latest brief specify **₦5,000**; the latest brief wins.
- The older colour board differs from the new brief. Use the new brief's explicit palette as the proposed direction rather than silently mixing both.

## 2. Scope and creative decisions

**Concept:** Bring them into focus. Visibility + Authority = Visority.

**Feel:** Editorial conference × premium digital product × bold African creative campaign.

### Palette

| Token | Value | Use |
|---|---|---|
| Ink | `#0F0028` | Main dark backgrounds and readable dark text |
| Oxblood | `#290101` | Warm dark passages and portrait contrast |
| Blush | `#FAE7EE` | Light sections and breathing room |
| Flame | `#F4480C` | Campaign fields and selected emphasis |
| Punch | `#DA1B68` | Speaker accents and Premium label |
| Sun | `#FBCD37` | Primary highlights and dark-section CTAs |
| Electric Blue | `#0467B0` | Occasional supporting detail |
| Mint | `#AEE4E0` | Occasional cool contrast |

Approximate visual distribution: 45% dark, 25% light, 15% orange, 7% magenta, 5% yellow, 3% blue/mint. These guide composition rather than rigid area calculations. Test contrast for each actual text/background pairing; bright colours are not interchangeable text surfaces.

**Typography:** Bricolage Grotesque for major display text and Instrument Sans for body/UI. Obtain licensed font files and self-host with their licences. Use existing Moara only for occasional campaign lettering if it matches the supplied poster once available. Do not ship five competing font families. Local Inter Tight remains the fallback if the proposed font assets cannot be obtained.

**Layout:** Shared content width 1320px; consistent spacing scale; broad full-width chapters; disciplined editorial lines; restrained grain. Desktop hero roughly one viewport, with a short optional scroll scene. Mobile uses its own compact composition with natural content height.

**Signature:** A layered focus field reveals the headline and human imagery, then resolves into the Visibility + Authority equation. Make the equation one major moment, not two repetitive sections.

**Motion:** Focus crossfades, mask-like reveals, modest depth, marquee movement and portrait scale/crop. Animate transforms/opacity; simulate blur-to-focus using precomposed layers rather than continuous expensive blur. Do not scroll-hijack. Reduced-motion users receive the complete story immediately.

## 3. Final experience and routes

| Order | Homepage section | Required result |
|---|---|---|
| 1 | Cinematic hero | Event identity, 28–30 Oct 2026, live online at 8pm WAT, headline, one primary CTA |
| 2 | Legacy proof | Clearly label 500+ attendees, 14 countries and one previous edition as 2024 history |
| 3 | Problem | “You're good. But are you known?” with three short argument lines |
| 4 | Visority equation | Visibility + Authority = Visority; resolve the preceding story |
| 5 | Transformation | Four horizontal chapters: Mind, Money, Position, Authority |
| 6 | Audience | “Built for people who build”; typographic interlude, no emoji cards |
| 7 | Speakers | Three distinct editorial portrait panels with names, topics and credible achievements |
| 8 | Three-day journey | Be Seen → Build Value → Become the Authority; dates/time visible without tabs |
| 9 | 2024 archive | Real historical material with captions and attribution; no invented testimonials |
| 10 | Tickets | Standard Free vs Premium ₦5,000 before registration |
| 11 | FAQ | Five to seven useful answers covering attendance and purchase objections |
| 12 | Finale/footer | “Your work deserves to be seen”; primary action returns to ticket choice |

Primary navigation: Experience, Speakers, Schedule, Tickets, Partner. Ambassador link moves to the footer.

| URL | Behaviour |
|---|---|
| `/#pricing` | Preserve the shared public pricing link |
| `/#about`, `/#tracks` | Retain anchor aliases at the transformation chapter |
| `/register/?pass=standard` | Six-step form with Standard visibly selected |
| `/register/?pass=premium` | Same form with Premium visibly selected |
| `/partners/` | Partnership tiers, corporate sponsorship and existing lead form |
| `/ambassadors/` | Existing referral experience with honest copy feedback |
| `/checkout/vip/` | Preserve route; use “Premium” in visitor-facing copy |
| `/access/standard-confirmation/` | Preserve Standard confirmation and calendar flow |
| `/vip/thank-you/` | Preserve route; do not imply paid access on unverified data |

Legacy homepage `#register` should route to the new registration page, respecting `tier=vip`. Legacy `#partnerships` and `#ambassadors` should route to their new pages. Use trailing slashes because the current local server resolves directory indexes only with a trailing slash. Preserve referral query parameters through ticket selection and registration; do not promise referral attribution that is not actually stored.

## 4. File map

All paths below are relative to the repository root.

| File | Responsibility |
|---|---|
| `index.html` | Rebuilt homepage, semantics, content, navigation and metadata |
| `assets/css/visority.css` — new | Shared palette, typography, spacing, buttons, panels, form states and responsive rules |
| `assets/js/site.js` — new | Menu, accessible FAQ, legacy-anchor routing and shared UI behaviour |
| `assets/js/motion.js` — new | Progressive scroll reveals, desktop focus scene and reduced-motion handling |
| `assets/js/registration.js` — new | Migrated six-step form and pass selection; retain existing payload field names |
| `assets/js/partners.js` — new | Migrated partner form and separate endpoint use |
| `assets/js/analytics.js` — new | Small event adapter; no personal data in event properties |
| `register/index.html` — new | Dedicated registration page |
| `partners/index.html` — new | Dedicated partnership page |
| `ambassadors/index.html` — new | Dedicated ambassador page and referral controls |
| `checkout/vip/index.html` | Shared visual system, Premium terminology and truthful payment states |
| `access/standard-confirmation/index.html` | Shared visual system, correct onward links and calendar content |
| `vip/thank-you/index.html` | Shared visual system and verified/pending payment distinctions |
| `Brand_Assets/02. Images/optimized/` — new | Optimized portrait/hero derivatives; retain originals |
| `Brand_Assets/2024/` — new when real assets arrive | Authentic archive assets, captions and provenance |
| `fonts/` | Licensed display/body font assets |
| `qa.mjs` | Multi-route audit with meaningful failure exit status |
| `qa-flows.mjs` — new | Browser regression checks using mocked submissions/payments |
| `package.json` | Add `qa:flows` command, retaining current scripts |
| `.vercelignore` | Exclude internal plans, source notes and development-only artifacts from deployment |
| `memory.md`, `Brand_Assets/Landing_Page_Copy.md`, `Brand_Assets/04. Copy/Landing_Page_Copy.md` | Align outdated design, price and flow notes with approved decisions |

Keep homepage-specific composition in `index.html`; extraction is limited to genuinely shared styles and behaviour. No unrelated repository restructuring.

## 5. Implementation phases

### Phase 1 — Baseline, content and design foundation

**Files:** `index.html`, `assets/css/visority.css`, `fonts/`, the existing screenshot tooling and project content notes.

- [ ] Record the starting revision, current routes and form/payment contracts; preserve any subsequent user edits.
- [ ] Confirm the linked Vercel project's production branch before any push. Work locally on a `codex/` branch to avoid accidental production deployment.
- [ ] Start or reuse `npm run serve`; capture current desktop, tablet and mobile screenshots with `npm run shot`, `npm run shot:tablet`, `npm run shot:mobile`.
- [ ] Inventory actual images, portrait crops and fonts. Treat stage art as conceptual imagery, never proof of an in-person event.
- [ ] Establish the palette, type scale, 1320px container, spacing, CTA variants, stat, ticket, accordion and editorial panel styles.
- [ ] Reconcile all event dates, topics, speaker names, pass benefits and ₦5,000 pricing against the supplied brief and existing content.

**Acceptance:** One consistent foundation exists; text contrast and keyboard states work on light and dark surfaces; no unsupported 2026 attendance figures remain in planned copy.

### Phase 2 — Conversion architecture and registration

**Files:** `index.html`, `register/index.html`, `partners/index.html`, `ambassadors/index.html`, `assets/js/site.js`, `assets/js/registration.js`, `assets/js/partners.js`.

- [ ] Move registration to `/register/` with persistent selected-pass heading, visible `01 — 06` progress, Back and change-pass controls.
- [ ] Preserve identity, role, WhatsApp, challenge, expectation and optional note fields. Keep Enter advancement, “Other” inputs and controlled choice auto-advance; Enter in the final textarea must insert a newline.
- [ ] Normalize `pass=premium` to the existing internal `vip` tier, preserving downstream storage keys and checkout compatibility.
- [ ] Retain valid input when moving backwards. Invalid steps show a specific message and focus the relevant field. Disable double submission and restore the action on failure.
- [ ] Move partnerships and ambassador functions to their own pages; preserve the separate partner endpoint and existing lead fields.
- [ ] Preserve legacy anchors, referral parameters and `tier=vip` links. Unknown pass values default to Standard and clearly show that selection.
- [ ] Use absolute site-root asset paths on nested pages so portraits, fonts and scripts load consistently.

**Pass contract:**

```js
const query = new URLSearchParams(location.search);
const selectedTier = query.get('pass') === 'premium' || query.get('tier') === 'vip'
  ? 'vip'
  : 'standard';
const destination = selectedTier === 'vip'
  ? '/checkout/vip/'
  : '/access/standard-confirmation/';
```

**Payload contract:** Preserve `fullName`, `email`, `role`, `whatsApp`, `coreChallenge`, `desiredExperience`, `customNote`, `selectedTier`, `submittedAt`. Preserve `visority_vip_registration` and `visority_standard_registration` storage keys. Do not put registrant details into analytics.

**Acceptance:** Both passes can complete the form in mocked local tests and reach the correct route. Partnership leads use the partnership destination. Refreshing or directly opening a nested route works.

### Phase 3 — Hero, proof, problem and equation

**Files:** `index.html`, `assets/css/visority.css`, optimized artwork.

- [ ] Build the orange/wine focus field with five visual layers: atmosphere, portal, campaign lettering, human subject, headline/interface.
- [ ] Use “Building Africa's Most Wanted Professionals”, the three-night description, “Enter the room” linking to pricing, and “Explore the experience” linking into the story.
- [ ] Move the countdown, repeated statistics and noisy marquee out of the hero. Keep date, online format and time immediately readable.
- [ ] Build the compact historical proof band using the existing 2024 claim, visibly attributed to that edition.
- [ ] Build the problem and equation as a continuous narrative. The hero transition hints at the equation; the equation section supplies the full reveal once.
- [ ] Compose mobile separately: fewer visual layers, readable line breaks, no long pinned scroll and no clipped primary action.
- [ ] Capture and critique desktop/mobile screenshots twice, fixing hierarchy, contrast, text/art overlap and section pacing before proceeding.

**Acceptance:** Event purpose, format, date and ticket action are obvious on first view. The experience remains complete with animation disabled.

### Phase 4 — Transformation, audience, speakers and schedule

**Files:** `index.html`, `assets/css/visority.css`, portrait derivatives.

- [ ] Replace About/Tracks duplication with Mind, Money, Position and Authority horizontal chapters. Each has one number, heading, short paragraph and intentional visual.
- [ ] Add the typographic audience interlude. Its content is available without motion or hover, and any moving marquee can be paused.
- [ ] Give Divine Chukwuemeka, Mandy Chinedum and Ikenna Okpara distinct portrait compositions; names and talk information remain selectable text.
- [ ] Highlight existing speaker claims with clear attribution; do not invent further achievements. Use Mandy's 50+ brands and 55K+ viewers only as existing supplied claims.
- [ ] Present all three days vertically: 28 Oct / Be Seen; 29 Oct / Build Value; 30 Oct / Become the Authority. Each shows 8pm WAT and the appropriate speaker/topic.
- [ ] Use a detailed-schedule accordion only if additional real schedule content justifies it.

**Acceptance:** No repeated About/Tracks grids; no speaker cards masquerading as full editorial panels; dates and session details are accessible without interacting with tabs.

### Phase 5 — Trust, tickets, FAQ and closing conversion

**Files:** `index.html`, `Brand_Assets/2024/`, shared styles.

- [ ] Build a captioned 2024 collage from supplied authentic assets. Use consented/redacted community screenshots; no fake chat messages, generated attendees or stock images labelled as history.
- [ ] If archive assets are still absent, ship a restrained historical text section using the existing 2024 figures and report the missing collage explicitly. Do not leave empty image slots.
- [ ] Place tickets before registration. Standard includes three-day live access and networking; Premium includes live access, recordings, premium community, notes, priority Q&A, resource vault and identity tag, per the new brief.
- [ ] Use “Enter free” and “Go Premium”; display ₦5,000 consistently in the comparison and checkout.
- [ ] Keep FAQ to five–seven answers: virtual access, schedule/timezone, pass differences, recordings, suitability, joining instructions and payment/help where real policy is available. Do not invent refund terms.
- [ ] Close with “Your work deserves to be seen” and a ticket-selection CTA. Put secondary organisation links in the footer.

**Acceptance:** Visitors can compare complete benefits before sharing personal information. Historical proof is clearly separated from the upcoming event. All CTAs have useful destinations.

### Phase 6 — Motion, mobile and accessibility finish

**Files:** `assets/js/motion.js`, shared styles and all pages.

- [ ] Add desktop focus-field parallax with one scheduled animation-frame update and bounded transforms; deactivate work when the scene is offscreen.
- [ ] Use IntersectionObserver for one-time reveals. Render content visible by default so script failure cannot hide the site.
- [ ] Disable parallax, pinning and marquee movement for `prefers-reduced-motion`; handle preference changes during the session.
- [ ] Make portraits, chapter order and type sizing work at 360px, 390px, 768px and 1440px widths, and at 200% zoom.
- [ ] Add a skip link, logical heading hierarchy, visible keyboard focus, semantic controls and focus restoration for any dialogs. Aim for 44px touch targets.
- [ ] Optimize images with explicit dimensions and responsive sources. Preload only critical font/hero assets; lazy-load below-fold imagery and avoid large mobile background downloads.

**Acceptance:** No horizontal overflow, scroll trapping, hidden copy, inaccessible hover-only content or motion required to understand the event.

### Phase 7 — Data, checkout and release readiness

**Files:** registration/partner scripts, checkout/confirmation pages, `GoogleSheetsWebhook.gs` only if an agreed integration repair is implemented.

This phase distinguishes visual work from unresolved service configuration. Local design work can finish without external credentials; production readiness cannot be claimed while the active journey simulates success.

- [ ] Replace duplicate client submission with one request per attempt. Do not call an opaque response confirmed registration. Show a truthful sent/pending state until receipt can be verified.
- [ ] Remove personal payload logging. Preserve entered values and provide an actionable retry message when transport fails.
- [ ] Check the deployed Google Apps Script contract against the checked-in script. If acknowledged submission is required, specify a same-origin server endpoint that reads the upstream result; do not silently add a new backend or claim success from `no-cors`.
- [ ] Update checkout/confirmation typography, palette and Premium naming while retaining legacy URLs.
- [ ] Keep sandbox payments confined to explicit local/test usage. A URL reference or localStorage flag must not unlock paid access or claim verified payment.
- [ ] Before accepting production Premium payments, require server verification of transaction status, NGN currency, 500000 kobo amount and the corresponding purchase identity. Missing payment credentials/configuration are a production blocker, not a reason to simulate success.
- [ ] Replace community placeholders with supplied URLs. A missing link must not render an active “Join” button.
- [ ] Supply the missing sponsorship PDF or replace its download action with the working partnership enquiry action.
- [ ] Inspect bank-transfer/international methods and describe only functioning actions. A local receipt filename is not evidence of an uploaded or reviewed payment.

**Acceptance:** No fake success path or broken onward link is presented as functioning production access. If backend/payment work needs a separate implementation, document its exact outstanding scope before release; do not expand this design project without making that scope visible.

### Phase 8 — Measurement, QA and deployment

**Files:** `assets/js/analytics.js`, `qa.mjs`, `qa-flows.mjs`, `package.json`, `.vercelignore`, content notes.

- [ ] Instrument `hero_cta_click`, `ticket_section_view`, `standard_selected`, `premium_selected`, `registration_started`, `registration_completed` and `partner_click` through one adapter. Connect the existing analytics destination if configured; otherwise report instrumentation as unconnected rather than claiming live tracking.
- [ ] Fire ticket visibility once per page visit. Define registration started as first meaningful form interaction. Fire completed only on acknowledged registration, never just a button click; do not confuse it with paid conversion.
- [ ] Expand QA across all seven pages and include tablet/reduced-motion coverage. Make failed checks exit nonzero; the current audit only reports totals.
- [ ] Add focused flow tests for pass selection, six-step validation/back navigation, one submission per attempt, submission failure, destination routing, partner routing and unverified payment states. Mock external calls so QA does not create real leads or charges.
- [ ] Run `npm run qa`, `npm run qa:flows`, `npm run shot`, `npm run shot:tablet`, `npm run shot:mobile`. Expected results: zero failing assertions, no horizontal overflow, broken assets or console errors; inspect screenshots rather than treating their existence as a visual pass.
- [ ] Verify `/#pricing`, legacy anchors, direct nested routes, navigation, calendar dates and real onward destinations. Confirm network requests do not carry personal information to analytics.
- [ ] Check performance using repeatable mobile conditions. Target LCP ≤2.5s and CLS ≤0.1 in representative lab checks; field INP ≤200ms is a post-launch target, not something one screenshot can prove.
- [ ] Update stale price/architecture notes and exclude internal docs, source notes, tooling and unnecessary asset archives from the hosted output.
- [ ] Confirm Vercel authentication/project/branch, then create a preview deployment after local approval. Record the preview URL and tested revision.
- [ ] Present the finished preview for live-release confirmation. On approval, deploy the tested revision, smoke-test the live URLs, and keep the previous deployment available for rollback.

**Acceptance:** Reviewable local and preview builds; passing functional/responsive checks; known limitations disclosed; production rollout and rollback target identified.

## 6. Inputs and decisions attached to approval

Approval of this plan accepts the new palette, Bricolage Grotesque + Instrument Sans direction, ₦5,000 Premium price, dedicated registration page, separate partner/ambassador pages and the 12-section homepage.

The following inputs improve fidelity or unblock release; they do not prevent starting the design after approval:

1. Original new campaign poster/wordmark and colour-board files, if exact matching beyond the written palette is wanted.
2. Authentic 2024 screenshots, testimonials or short videos, with permission for identifiable people and messages.
3. Final Standard/Premium community destinations and any actual sponsorship prospectus.
4. Existing payment verification service/configuration and analytics destination, if available. Secret keys belong in deployment environment settings, never in this document or client code.

Without archive material, the text-only historical section is the honest fallback. Without verified payment/registration completion, report the release limitation explicitly and do not publish a simulated purchase journey.

## 7. Review and release sequence

1. **Now:** User confirms or revises this plan. No website edits yet.
2. **After confirmation:** Implement locally in the order above; internally review the first four sections before extending their design to the rest.
3. **Review:** Show the completed local build and Vercel preview, with screenshots, test results and remaining asset/configuration gaps.
4. **Release:** Publish the reviewed revision only after live-release confirmation, then smoke-test and report the final URL.

## 8. Coverage check

- Palette, focus concept, typography, reusable primitives: phases 1 and 3.
- Hero depth, historical proof, problem and equation: phase 3.
- Merged transformation chapters, audience, editorial speakers and three-day journey: phase 4.
- Authentic archive, pricing-first conversion, FAQ and finale: phase 5.
- Dedicated registration and separate partner/ambassador audiences: phase 2.
- Purposeful motion, mobile composition and reduced motion: phases 3 and 6.
- Performance, analytics, functional QA and safe publication: phases 7 and 8.
- Existing data/payment issues and missing assets: explicitly tracked rather than hidden by the visual rebuild.
