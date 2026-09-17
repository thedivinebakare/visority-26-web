# Premium local evolution

Status: implementation authorized by the user's request. Local only. Baseline archived at `backups/visority-live-v1-72cfb35.zip`.

Design read: evolve the existing African creative conference campaign into a cinematic, polished web experience. Variance 8, motion 7, density 3. Preserve the established flame, wine, pink, yellow and blush brand palette and intentional dark/light chapter changes; the original explicit brief overrides generic single-accent and single-theme skill defaults.

Audit: current hero is a flat centred poster with an oversized empty mobile bottom. Repetitive micro-labels and opaque saturated fields flatten the page. Speaker names intersect faces. Static content offers little discovery. Existing slugs, form fields, brand wordmark, analytics hooks and truthful payment states must stay intact.

Files and tasks:
- [x] `scripts/homepage.mjs`: focused homepage renderer, asymmetric portrait hero, speaker feature panels and accessible biography dialogs, expandable sessions, pass comparison.
- [x] `scripts/build-pages.mjs`: consume renderer, preserve seven existing routes and registration contracts.
- [x] `assets/css/premium.css`: refined composition, responsive type, floating navigation, curved image apertures, layered tickets and form polish. Sharp editorial panels, 8px inputs, pill buttons are the consistent shape rule.
- [x] `assets/js/experience.js`: native dialogs and focus restoration, intersection-driven active sections and ticket dock, individual calendar downloads, non-blocking focus scene motion. Respect reduced motion and coarse pointers.
- [x] Registration: preserve existing `assets/js/registration.js` behaviour; improve presentation through shared styles without changing fields or data contracts.
- [x] `qa-premium.mjs`: dialogs/Escape, session expansion/calendar, compare control, dock state, full mobile/desktop layout and reduced motion.
- [x] Existing regression checks and two screenshot review rounds completed. Local preview remains at `http://localhost:3000/`. No push or deployment.

Asset note: attempted a bespoke optical-sculpture hero via built-in image generation. Usage limit prevented generation; no new asset was produced. Use the existing speaker portraits with native CSS compositing; do not fabricate historic proof.
