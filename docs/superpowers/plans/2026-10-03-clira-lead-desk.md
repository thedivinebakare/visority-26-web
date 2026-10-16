# Clira lead desk implementation plan

**Goal:** Compact private workspace for finding leads, understanding their answers, preparing WhatsApp follow-ups and saving status/notes.
**Architecture:** Existing static page and authenticated `/api/clira-leads` remain. Render compact rows and a native dialog drawer. Generate editable deterministic messages from available answers only. Preserve existing Sheet integration and legacy statuses.
**Tech stack:** HTML, scoped CSS, vanilla JavaScript, Node API, existing Apps Script.

## Constraints
- Local preview only; no production deployment or live lead edits.
- Wine #401b25, pearl #f6f3ed, yellow #ffcf32, ink #291c20, muted #74686b.
- Bricolage Grotesque headings, Instrument Sans body; 8px controls, dividers instead of cards.
- No automatic messaging or automatic contacted status.
- Missing form answers must not be invented. Existing blank Google headers omit two fields; display unavailable until the sheet owner names them.

## Tasks
- [x] Extend `server/clira.cjs` mapping for challenge/goal/reason and accept Closed while retaining legacy values. Test canonical and actual sheet headings in `qa-clira.cjs`.
- [x] Replace `clira/index.html` and `assets/css/clira.css` with compact two-view workspace, horizontal counters, search/filters, lead list and accessible detail dialog. Full-screen details on mobile.
- [x] Replace `assets/js/clira.js`; keep session auth, API contract and error handling. Preserve message/note drafts across panel switches; explicit save button; update display only on acknowledged saves; filter legacy Interested into Follow-up and Not Interested into Closed without mutating stored values.
- [x] Add pure message/phone/status helpers in `assets/js/clira-model.js`, tested against missing answers, Nigerian/international phones and legacy statuses.
- [x] Verify using intercepted synthetic API responses: auth, search, filters, summary counters, detail focus/Escape, editable message, encoded WhatsApp, save failure/retry and mobile layout. No real Sheet writes. Run production build and inspect screenshots at desktop/mobile sizes.
- [x] Leave a local preview running and report any integration limitations.
