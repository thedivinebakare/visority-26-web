# VISORITY_CLIRA_V1.md

**Project:** Visority '26 — Clira V1  
**Type:** Private lead follow-up dashboard  
**Status:** V1 (synthetic-safe, no real data used during build)  
**Owner:** Visority Team

---

## What Clira is

Clira is Visority's private "follow-up command centre". It reads registrants from the existing Visority Google Sheet, shows who needs follow-up at a glance, lets the team update a lead's **Follow-up Status** and add a short **Internal Note**, and generates a **personalised WhatsApp message** (opens in WhatsApp, never auto-sends). It reuses the Visority brand system (wine/cream/orange/sun) so it feels like the same design team built it.

Key constraints honoured: V1 only, no multi-tenancy, no subscriptions, no AI auto-send, no Meta WhatsApp API, no full CRM. Access is gated by a single shared server-side key.

---

## 1. Architecture

| Layer | Purpose |
|---|---|
| `clira/index.html` | Frontend shell (static). Loads brand CSS, `clira.css`, `clira-config.js`, `clira.js` (module). |
| `assets/js/clira-config.js` | Single source of truth: column mapping, pipeline statuses, WhatsApp templates, brand-voice copy. Tunable without touching HTML/JS logic. |
| `assets/js/clira.js` | Fetch/render, filters/search, status updates, notes, WhatsApp link generation. Stores the access key in `sessionStorage` only. |
| `assets/css/clira.css` | Clira-specific layout. Inherits all tokens from `assets/css/visority.css` (no new palette). |
| `api/clira-leads.js` → `server/clira.cjs` | Serverless proxy. Enforces access key, maps sheet headers to Clira fields, serves demo data if the sheet connector isn't configured, forwards read/update to Google Apps Script. |
| `GoogleSheetsWebhook.gs` | Existing registration webhook, **extended** with `doGet`, `action:'update'` (write-back), and `setupCliraColumns()`. Bound to the same registration sheet. |
| `clira/sample-leads.json` | 14 synthetic leads for local/dev/demo with `demo: true` flag. |

Flow: Browser → `/api/clira-leads` (Bearer/`X-Clira-Key`, checked server-side with timing-safe compare) → Google Apps Script Web App (`doGet`/`doPost` with `CLIRA_SHARED_SECRET`) → Google Sheet. The Apps Script URL and secret never reach the frontend.

---

## 2. Google Sheet columns expected

Clira **does not assume** the sheet has `Source`, `Follow-up Status`, or `Last Note`. It maps existing registration columns and degrades gracefully when extras are missing.

| Clira field | Sheet header (mapped) | Notes |
|---|---|---|
| `name` | `fullName` | Required for WhatsApp first name. |
| `phone` | `whatsApp` | Normalised to digits for `wa.me/` (spaces, `+`, `()`, `-` stripped). |
| `email` | `email` | **Primary key for write-back** (case-insensitive match). Must be unique per row. |
| `ticket` | `selectedTier` | `standard` or `vip`/`Premium` as written. Empty → ticket sentence dropped from WhatsApp templates. |
| `role` | `role` | Displayed as a chip. |
| `source` | `Source` (configurable) | Empty by default. Becomes `—` if absent. |
| `date` | `submittedAt` | ISO 8601 preferred; displayed as `DD Mon YYYY`. |
| `status` | `Follow-up Status` | Pipeline value. Added by `setupCliraColumns()`. Defaults to `New` if missing on read. |
| `note` | `Last Note` | Internal note (max 1000). Added by `setupCliraColumns()`. |

**Important:** The registration webhook (`doPost`, original branch) still appends exactly **9 columns** in the original order. The Clira headers are **appended to the right** (never inserted), so existing write paths are not affected.

---

## 3. Pipeline & filters

Defined in `assets/js/clira-config.js`:

```js
statuses: ['New','Contacted','Interested','Follow Up','Registered','Not Interested']
needsFollowUp: ['New','Contacted','Interested','Follow Up']
filters: ['All','New','Contacted','Follow Up','Registered']
```

- Summary tiles: **Total**, **Needs follow-up** (urgent, uses sun `#fbcd37`), **New**, **Registered**. Uses the oversized editorial number treatment (same as the homepage proof stats).
- Chips: `New` = cream, `Contacted` = muted blush, `Interested` = orange, **`Follow Up` = `#fbcd37`** (only this state uses yellow emphasis), `Registered` = mint, `Not Interested` = subdued. Ticket chip inherits the status tint when present.
- Filters are tabs (role=tablist). Counts update live after any status change.

---

## 4. WhatsApp templates

Configured in `clira-config.js`. Placeholders: `{{first_name}}`, `{{ticket_or_registration_type}}`. If `ticket_or_registration_type` is empty/whitespace, the entire sentence that references it is removed automatically (no dangling blank line).

**First follow-up (`first`):**
> Hi {{first_name}}, this is the Visority team.
>
> You recently showed interest in Visority, and I just wanted to personally follow up with you.
>
> I noticed you registered / showed interest in {{ticket_or_registration_type}}.
>
> Do you have any questions I can help you with before you complete your registration?

**Nudge (`nudge`):**
> Hi {{first_name}}, just checking back in regarding Visority.
>
> I wanted to make sure you had everything you needed to complete your registration.
>
> Is there anything currently stopping you from moving forward?

`templateFor` maps each status to which template is the default primary action (`New/Interested/Follow Up/Contacted/Registered/Not Interested`). The UI offers a small "Use nudge/Use first message" toggle per lead to switch templates on-the-fly. **The button opens `wa.me` in a new tab; it never auto-sends the message.**

Phone numbers are normalised (`[^\d]` removed; leading `00` → stripped). If the lead has no phone, the WhatsApp action is disabled.

---

## 5. Environment variables

Set these in **Vercel Project Settings → Environment Variables** (Production/Preview/Development as needed). Do **not** commit them.

| Variable | Required | Purpose | Example |
|---|---|---|---|
| `CLIRA_ACCESS_KEY` | **Yes** (server-side) | Shared access key for `/api/clira-leads`. Compared with timing-safe equality. Also used as the bearer token sent by the browser. | `clira-prod-9f7a…` (>=40 random chars recommended) |
| `CLIRA_SHEETS_URL` | Optional | Full Web App URL of the extended `GoogleSheetsWebhook.gs` (`doGet` + `doPost action=update`). If **unset**, Clira serves `clira/sample-leads.json` with `demo: true` and all saves return `savedLocally: true` (no writes to the sheet). | `https://script.google.com/macros/s/AKfycb…/exec` |
| `PUBLIC_SITE_URL` | Optional | Used by `originAllowed()` (already set for the existing funnel). | `https://www.visoritylive.com` |
| `FUNNEL_SESSION_SECRET` | Optional | Already present; unused by Clira. | (leave as-is) |

**Note:** The Apps Script uses a separate secret `CLIRA_SHARED_SECRET` stored in **Apps Script → Project Settings → Script Properties**. For simplicity, set `CLIRA_SHARED_SECRET` to the **same value** as `CLIRA_ACCESS_KEY` (one shared secret to rotate if needed). The Apps Script accepts it via `X-Clira-Key` header or `?key=`/`key` in POST.

---

## 6. Google Apps Script setup (one-time)

You must extend the existing bound script (the one that currently receives registrations). Do **not** create a new sheet/project unless necessary.

1. Open `GoogleSheetsWebhook.gs` in Apps Script (bound to the Visority registration spreadsheet).
2. **Add headers (optional but recommended):** Run `setupCliraColumns()` once from the editor (Run → Function → `setupCliraColumns`). This appends `Follow-up Status`, `Last Note`, `Status Updated` to row 1 if missing. Idempotent.
3. **Script Properties:** Project Settings → Script Properties → Add:
   - `CLIRA_SHARED_SECRET` = same value as `CLIRA_ACCESS_KEY` (Vercel)
4. **Deploy as Web App:**
   - Deploy → New deployment → Type: Web app
   - Execute as: **Me**
   - Who has access: **Anyone** (required so Vercel can call it server-side). The endpoint is still protected by the shared secret; it's not public read/write without the key.
   - Deploy → Authorise → Copy the Web App URL → set `CLIRA_SHEETS_URL` in Vercel.
5. **Test doGet:** `curl "<WEB_APP_URL>?key=<CLIRA_SHARED_SECRET>"` should return `{ok:true, leads:[...], syncedAt:...}` (401 without key). With real data, statuses/notes may be empty until filled in Clira.
6. **Test update:** In Clira (demo off) change a lead's status → the sheet cell updates and `Status Updated` becomes ISO timestamp. If the email appears twice, Clira shows the ambiguity error and writes nothing.

---

## 7. Local development

```bash
# From C:\Users\NexusPC\Projects\Visority'26 Web
npm run serve        # serves http://localhost:3000
# Visit http://localhost:3000/clira/
```

- With **no** `CLIRA_SHEETS_URL`: loads `clira/sample-leads.json`, banner "Showing synthetic sample records. No live Visority data." appears. Saving notes/statuses returns `savedLocally: true` (UI shows "Saved for this session") — no sheet writes.
- With `CLIRA_SHEETS_URL` + `CLIRA_ACCESS_KEY` in `.env` (local preview only): reads live sheet, writes back. Never commit `.env`.
- Access gate: first load shows a small unlock card. Key is stored in `sessionStorage` only (cleared when the tab/session ends).

---

## 8. QA & verification

**Unit/integration smoke:** `node qa-clira.cjs`

Covers:
- GET without key → 401
- Bad key length → 401
- GET with valid key → 200, maps columns correctly (name/email/ticket)
- POST unknown status → 400
- Ambiguous email error path (propagates Apps Script's message)
- Template drops ticket sentence when ticket is empty
- Demo mode when `CLIRA_SHEETS_URL` unset (`demo: true`, returns leads)

**Manual UI QA (required):**
- `npm run serve` → load `/clira/` in demo mode.
- Search by name/phone/email; filters All/New/Contacted/Follow Up/Registered.
- Change status on a lead → tile counts + chip update instantly.
- Add a note → Save → state becomes "Saved for this session" (demo) or "Saved to the sheet".
- WhatsApp primary: opens `wa.me` with encoded first template. Toggle to nudge → URL updates. Remove ticket in config simulation → ticket sentence disappears.
- Mobile (390) and tablet (768): stacked cards, WhatsApp CTA remains immediately accessible, no horizontal scroll.
- Desktop (1440): editorial grid, thin dividers, numbers breathe.
- No console errors, fonts loaded, zero horizontal overflow.

**Brand comparison:** Use `npm run shot`, `npm run shot:tablet`, `npm run shot:mobile` against `http://localhost:3000/clira/`. Compare with existing Visority screenshots in `temporary screenshots/`. Fix spacing/typography/colours until no visible differences remain (≥2 comparison rounds).

---

## 9. Files created/modified

**Created**
- `assets/js/clira-config.js` — configuration (column map, statuses, templates, copy)
- `clira/index.html` — dashboard shell
- `assets/css/clira.css` — Clira styles (brand-aligned)
- `assets/js/clira.js` — frontend logic (module)
- `server/clira.cjs` — proxy + mapping + demo
- `api/clira-leads.js` — thin re-export
- `clira/sample-leads.json` — synthetic data
- `qa-clira.cjs` — smoke tests
- `VISORITY_CLIRA_V1.md` — this document
- `docs/CLIRA_SETUP.md` — Apps Script + Vercel deployment steps (separate)

**Modified**
- `GoogleSheetsWebhook.gs` — added `setupCliraColumns()`, `doGet()`, `clira*()` helpers, `action:'update'` branch in `doPost()`. Original registration append path unchanged.
- `serve.mjs` — added `'clira-leads'` to API allowlist.

**Not modified**: registration funnel, payment, ambassadors, skill-fund pages. No existing CSS classes renamed.

---

## 10. Security & privacy

- Access key is **never** exposed to the browser in a non-gated state; the gate is enforced server-side (`/api/clira-leads` returns 401 without valid key). The key travels only in `Authorization: Bearer`/`X-Clira-Key` headers to the API route (server-side). `sessionStorage` only on the client.
- Google Apps Script Web App is called **server-to-server** via Vercel's route (not from the browser). The `CLIRA_SHARED_SECRET` never reaches the frontend.
- Write-back uses **case-insensitive email match** and explicitly errors on **0 matches or >1 match** (ambiguity guard) — never guesses which row to update.
- `LockService` is used on the Apps Script side for both the original `doPost` and the `action:'update'` branch to avoid race conditions on concurrent updates.
- No PII logged. Requests timeout at 20s. Max note 1000, max rows read capped at 5000, blank rows filtered out.
- Demo mode (`CLIRA_SHEETS_URL` unset) uses synthetic data only — safe for sharing screenshots/reviews without real registrant data.
- `originAllowed()` (reused from `server/payment.cjs`) still applies to browser-initiated POSTs; server-to-server calls from Vercel don't rely on browser origin.

---

## 11. What is intentionally deferred (V2+)

- Multi-user authentication/permissions (roles, per-agent ownership)
- Assignment (who owns which lead)
- Automated WhatsApp sending / Meta WhatsApp Business API
- AI-generated message suggestions
- Lead scoring, tags/taxonomy beyond pipeline
- Activity timeline/audit log beyond `Status Updated`
- CSV export/import, bulk actions
- Real-time sync (polling every 60s is trivial later; manual Refresh is fine for V1)
- Multi-sheet/multi-client tenancy, billing/subscriptions
- Native mobile app

---

## 12. Quick reference

**Local URL:** `http://localhost:3000/clira/`  
**Build:** no build step (static HTML/CSS/JS, CommonJS serverless routes)  
**Deploy:** `vercel.json` unchanged (build uses `npm run build` → `dist/`). Clira lives at `/clira/` (not in `dist` build list except as static files if copied; Vercel serves the repo root as-is for these routes in this project setup). The API routes are under `/api/*` as before.  
**Rollback:** revert the modified files (`GoogleSheetsWebhook.gs`, `serve.mjs`) and delete the new Clira files. No schema changes to the registration write path.  

---

**End of document.**
