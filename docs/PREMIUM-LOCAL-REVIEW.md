# Premium experience: local review

The local version evolves the published Visority design. No push or deployment was performed for this iteration.

## Where to review

`http://localhost:3000/`

The published baseline is preserved at Git revision `72cfb35` and in `backups/visority-live-v1-72cfb35.zip`. The older pre-redesign archive also remains available.

## Experience improvements

- Portrait-led hero: dimensional layered photography, soft campaign lighting, pointer depth on desktop and progressive native scroll animation. Ticket action stays immediately accessible on phones.
- More restrained type, stronger spacing, fewer micro-labels, pill actions and consistent input styling across all seven pages.
- Editorial speaker panels keep lettering clear of faces; biography dialogs support keyboard focus, Escape and close controls.
- Three expandable sessions, each with a calendar file in the correct WAT/UTC time.
- Pass comparison expands into an accessible table without losing the simple initial two-pass decision.
- A contextual ticket shortcut appears after the hero and hides during the schedule, pricing, dialogs and footer.
- Sticky navigation, active-section cues, pauseable marquee, reduced-motion and reduced-transparency fallbacks.
- Registration, partner and ambassador pages inherit the refined design while preserving their field names, routes and submission behaviour.

## Validation

- `npm run qa`: existing registration/partner regression tests with mocked external calls; desktop, tablet and mobile overflow checks; all seven page routes.
- `npm run qa:premium`: 1440px desktop, 1280px laptop, 768px tablet, 390px and 360px phones; dialog open/close/focus restoration, session expansion, pass comparison, dock visibility, calendar output, reduced motion and static-content availability without JavaScript.
- Visual review screenshots: `temporary screenshots/premium-*.png`; supporting forms: `temporary screenshots/review-*.png`.

## Source files

- Homepage: `scripts/homepage.mjs`, imported by `scripts/build-pages.mjs`.
- Refined styles: `assets/css/premium.css`; base shared styles stay in `assets/css/visority.css`.
- Interactions: `assets/js/experience.js`.
- Run `npm run build` to regenerate pages and prepare the local `dist/` directory. Building does not publish anything.

## Existing limits carried forward

The real payment integration and acknowledged registration backend still need configuration. No fake payment verification was introduced. Existing speaker assets and provided claims are reused. Authentic 2024 archive material is still needed for a real collage.

An attempt to generate a bespoke optical-sculpture artwork using the built-in image tool was blocked by its usage limit. No generated image was produced or referenced; the finished local design uses the existing speaker photographs.

## Official brand refinement — local only

Replaced the placeholder header/footer mark and browser icon with the supplied official logo. The original JPEG is preserved alongside an optimized WebP. Replaced the portrait-led hero with a CSS 3D brand sculpture and transformation-focused copy. Pointer depth respects reduced-motion preferences. Removed oversized speaker backdrop names, simplified portrait framing, and marked Ikenna's special appearance in the speaker feature, navigation and schedule. Added a prominent ambassador programme section before the speakers and a main navigation link to it; its CTA leads to the existing ambassador page.

The new hero uses native CSS geometry; it does not depend on a generated image. Current changes are local and do not modify the production deployment.
