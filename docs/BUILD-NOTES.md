# Visority experience upgrade — 17 September 2026

The user-approved direction replaces the old inline funnel with a twelve-part editorial homepage and dedicated registration, partnership and ambassador pages. The original tracked build is archived under `backups/` at revision `de4cd75`.

## Working on this build

- Page content/templates: `scripts/build-pages.mjs`. Run `npm run build` after editing; it updates the seven HTML routes and prepares `dist/` for Vercel.
- Shared styling: `assets/css/visority.css`; self-hosted fonts: `assets/css/fonts.css`.
- Interaction scripts: `assets/js/`. No runtime framework or Tailwind CDN dependency.
- Local preview: `npm run serve`, at `http://localhost:3000`.
- Browser checks: `npm run qa`; calls to external lead endpoints are mocked.
- Vercel builds with `npm run build` and publishes `dist/` only.

## Implemented

Focus-field hero, revised proof/story hierarchy, transformation chapters, three editorial speaker sections, day-by-day schedule, historical text treatment, pass comparison, FAQ and final CTA. Dedicated six-step form preserves validation, Enter, Back, choices and pass routing. Partnership form uses its existing separate endpoint. Nested pages share the visual system. Fonts are self-hosted with licences, portraits use responsive WebP, reduced motion is supported, and internal documents are excluded from the public output.

## Explicit release limitations

- Premium payment is not configured: the previous placeholder-key fake-success checkout is replaced with an honest contact-the-team page. No payment is collected or verified by this build.
- Registration and partner forms submit once to the existing Apps Script endpoints. Opaque responses cannot confirm saved rows, so the interface says sent rather than confirmed. Acknowledged server-side registration remains separate integration work.
- Community invitations and sponsorship PDF were missing. Working email enquiries replace the broken actions.
- Authentic 2024 collage material was not supplied; the archive uses a typographic historical treatment and the existing 500+/14 claims.
- Analytics event hooks are available; no analytics vendor is configured, and registration_completed is deliberately not emitted for an unacknowledged submission.
- Existing speaker portraits and supplied biography claims are reused; their identity/claim provenance was not independently verified.

## Checks

Desktop 1440px, tablet 768px and mobile 390px/360px layouts; all routes at mobile size; registration pass choice, validation, Back, Enter, textarea newlines, one request per attempt, transport failure, partner endpoint, legacy registration link, reduced motion and forged payment URL. Tests create no real leads or charges. Two visual screenshot rounds are captured in `temporary screenshots/`.
