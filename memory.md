# Memory context for Visority'26

## Project Overview

* **Project Name:** Visority'26 (Annual Conference Platform)
* **Goal:** Build a high-converting, premium, frictionless web platform for Visority'26 featuring lead capture, tiered ticket checkout, and event redirection.
* **Location:** Built in this folder (`Visority'26 Web`), replacing/extending the current single-file `index.html` starter with the full stack needed.
* **Architecture Strategy:**
  * **Planning & Architecture:** Managed via Google Antigravity IDE (visual analysis, implementation strategy, component design).
  * **Code Execution:** Built locally in OpenCode / local editor to maximize API and usage limits.

---

## Source of Truth — Design Direction

* **Reference anchor:** `Brand_Assets/03. Base Website Build/Conclave 2026 - San Francisco.png` — use this for layout, spacing, typography, and color direction. Match it, don't improve it.
* **Brand assets:** `Brand_Assets/` holds the Inter Tight fonts, the color reference (`01. Colors/Color.png`), and the base website build image.
* **Colors:** Pull exact hex values from `Brand_Assets/01. Colors/Color.png`. Do not invent brand colors or fall back to default Tailwind palette.
* **Fonts:** **Inter Tight** lives in `Brand_Assets/00. FOnts/Inter_Tight/` (variable + static weights). Reference locally via `@font-face` — do not pull from a CDN if the local file exists. Pair it with a contrasting supporting typeface; use tight tracking on large headings.
* **External/API wiring (Google Sheets, Paystack, calendar) is deferred.** Get the design direction right first; connect integrations once the UI is locked.

---

## Core User Flow & Pages

```
┌────────────────────────────────────────────────────────┐
│  PAGE 1: LANDING & LEAD CAPTURE                        │
│  - High-impact hero, schedule, speaker cards          │
│  - Frictionless, 6-step inline animated form           │
└───────────────────────────┬────────────────────────────┘
                            │ (Form submission & auto-capture to Google Sheets)
┌───────────────────────────▼────────────────────────────┐
│  PAGE 2: CHECKOUT & PAYMENT                            │
│  - Ticket selection & low-fee payment methods          │
│  - Direct Bank Transfer, Paystack, International Pay   │
└───────────────────────────┬────────────────────────────┘
                            │ (Successful payment verification)
┌───────────────────────────▼────────────────────────────┐
│  PAGE 3: THANK YOU / ONBOARDING                        │
│  - Group redirects (WhatsApp/Community), DM links      │
│  - One-click "Add to Calendar" triggers                │
└────────────────────────────────────────────────────────┘
```

---

## Lead Capture Form Mechanics (6-Step Sequence)

The form operates inline directly on the landing page with step transitions managed via Framer Motion (`AnimatePresence`).

| Step | Field | Input Type | Behavior & Framing |
| --- | --- | --- | --- |
| **1. Identity** | Full Name & Email | Text & Email Inputs | Base commitment step with real-time validation. |
| **2. Role** | Professional Role | Choice Cards / Chips | Auto-advances 150ms after selection. |
| **3. Contact** | WhatsApp / Phone | Tel Input with Country Code | Direct messaging channel for event updates. |
| **4. Challenge** | Core Pain Point | Single-Choice Cards | *"What is the main challenge holding you back right now?"* (Auto-advances on tap). |
| **5. Expectation** | Desired Experience | Single-Choice Cards | *"What are you most excited to gain from attending?"* (Auto-advances on tap). |
| **6. Custom Note** | Note for Speakers/Team | Expandable Textarea | *"Is there anything specific you'd like the team or speakers to address?"* (Optional; submit button). |

---

## Technical & Design Specifications

* **Design Aesthetic:** Premium, sleek, high-end feel inspired by *Conference Corner* with dynamic dark/light elements, smooth glassmorphism cards, bold typography, and micro-animations.
* **Micro-Interactions:**
  * Auto-advance on choice steps (Steps 2, 4, 5) with a 150ms delay.
  * Blur-fade slide transitions between steps (`opacity: 0`, `filter: blur(4px)`).
  * Ultra-thin top progress bar indicating completion percentage.
  * `Enter` key auto-advancement for text steps.

* **Stack:** Built in this folder with the stack needed to realize the multi-page flow (React + Framer Motion for the form/transitions). Component-based, not a single static `.html`.
* **Data Integration (deferred until design is locked):**
  * Form payload syncs directly to **Google Sheets** (via Google Apps Script Webhook / SheetDB API).
  * Query parameters or local state carry lead data from Page 1 to Page 2 to pre-fill ticket checkout.

---

## Conventions & Guardrails (carried from CLAUDE.md)

* Mobile-first responsive.
* Never use default Tailwind palette (indigo/blue) as primary color — use brand hex.
* Never use flat `shadow-md`; use layered, color-tinted shadows.
* Animate only `transform` and `opacity`; never `transition-all`.
* Every clickable element needs hover, focus-visible, and active states.
* Images get a gradient overlay + color treatment layer.
* Serve on localhost for any screenshot/QA; use the project's `serve.mjs` / `screenshot.mjs` / `qa.mjs` tooling.
