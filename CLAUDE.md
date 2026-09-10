# CLAUDE.md — Visority '26 Frontend Rules

## Always Do First
- **Invoke frontend design guidelines** before writing any frontend code, every session, no exceptions.
- **Check `Brand_Assets/` first.** It holds the Inter Tight fonts, the color reference (`01. Colors/Color.png`), and the base website build reference (`03. Base Website Build/Conclave 2026 - San Francisco.png`). Match them.

## Reference Images
- If a reference image is provided: match layout, spacing, typography, and color exactly. Swap in placeholder content (images via `https://placehold.co/`, generic copy). Do not improve or add to the design.
- If no reference image: design from scratch with high craft (see guardrails below).
- Screenshot your output, compare against reference, fix mismatches, re-screenshot. Do at least 2 comparison rounds. Stop only when no visible differences remain or user says so.

## Brand Assets
- **Always check the `brand_assets/` folder before designing.** It may contain logos, color guides, style guides, or images.
- Fonts: **Inter Tight** lives in `Brand_Assets/00. FOnts/Inter_Tight/` (variable + static weights). Reference it locally via `@font-face` — do not pull Inter Tight from Google Fonts if the local file is available.
- If a color palette is defined (see `01. Colors/Color.png`), use those exact values — do not invent brand colors.
- Do not use placeholders where real assets are available. Use the reference in `03. Base Website Build/` as the anchor for layout direction.

## Local Server
- **Always serve on localhost** — never screenshot a `file:///` URL.
- Start the dev server: `npm run serve` (serves the project root at `http://localhost:3000`).
- `serve.mjs` lives in the project root. Start it in the background before taking any screenshots.
- If the server is already running, do not start a second instance.

## Screenshot Workflow
- **Always screenshot from localhost:**
  - `npm run shot` → desktop baseline at `http://localhost:3000`
  - `npm run shot:tablet` → tablet viewport
  - `npm run shot:mobile` → mobile viewport
  - Optional label suffix: `node screenshot.mjs http://localhost:3000 label`
- Screenshots are saved automatically to `./temporary screenshots/screenshot-N.png` (auto-incremented, never overwritten).
- After screenshotting, check spacing/padding, font size/weight/line-height, colors for exact hex, alignment, border-radius, shadows, and image sizing.

## QA Audit
- Run `npm run qa` to verify zero horizontal overflow, no console errors, no failed/broken requests, fonts loaded, and responsive layout sanity across desktop + mobile.

## Output Defaults
- Single `index.html` file, all styles inline/structured, unless user says otherwise.
- Tailwind CSS via CDN: `<script src="https://cdn.tailwindcss.com"></script>` with tailored config.
- Placeholder images: `https://placehold.co/WIDTHxHEIGHT` or enhanced brand assets.
- Mobile-first responsive.

## Anti-Generic Guardrails
- **Colors:** Never use default Tailwind palette (indigo-500, blue-600, etc.). Pick a custom brand color and derive from it. Pull hex values from `Brand_Assets/01. Colors/Color.png` when available.
- **Shadows:** Never use flat `shadow-md`. Use layered, color-tinted shadows with low opacity.
- **Typography:** Never use the same font for headings and body unless the brand demands it. For Visority '26, head toward Inter Tight (display/heavy weights) paired with a contrasting supporting font. Apply tight tracking (`-0.03em`) on large headings, generous line-height (`1.7`) on body.
- **Gradients:** Layer multiple radial gradients. Add grain/texture via SVG noise filter for depth.
- **Animations:** Only animate `transform` and `opacity`. Never `transition-all`. Use spring-style easing.
- **Interactive states:** Every clickable element needs hover, focus-visible, and active states. No exceptions.
- **Images:** Add a gradient overlay (e.g. `bg-gradient-to-t from-black/60`) and a color treatment layer with `mix-blend-multiply`.
- **Spacing:** Use intentional, consistent spacing tokens — not random Tailwind steps.
- **Depth:** Surfaces should have a layering system (base → elevated → floating), not all sit at the same z-plane.

## Hard Rules
- Do not add sections, features, or content not in the reference/spec.
- Do not stop after one screenshot pass.
- Do not use `transition-all`.
- Do not use default Tailwind blue/indigo as primary color.