# CLIRA_SETUP.md — Apps Script + Vercel deployment

This is the one-time setup for Clira V1. It connects the Clira dashboard (`/clira/`) to the existing Visority registration Google Sheet, without touching the live registration webhook behaviour.

---

## 1. Google Apps Script (one-time)

Clira extends `GoogleSheetsWebhook.gs` (already bound to the registration spreadsheet). You do **not** need a new Apps Script project.

### 1.1 Open the script
1. Go to [script.google.com](https://script.google.com/).
2. Open the Apps Script project that is bound to the **Visority '26 registration spreadsheet** (the same one that receives registration submissions).
3. Open `GoogleSheetsWebhook.gs` in the editor.

### 1.2 Add the Clira columns
Run once to append the follow-up columns if they don't exist.

1. In the function dropdown (top), select `setupCliraColumns`.
2. Click Run (▶). 
3. Grant the required permissions on first run (this script runs as you).
4. Expected result: `"All Clira columns already exist..."` or `"Added: Follow-up Status, Last Note, Status Updated"`.

This only **appends** columns to the right. It never inserts, reorders, or changes the existing 9 registration columns. The original `doPost` appendRow remains untouched.

### 1.3 Add the shared secret
1. In Apps Script → **Project Settings** (cogwheel, bottom left).
2. Under **Script Properties**, click **Add script property**.
3. Property: `CLIRA_SHARED_SECRET`
4. Value: set this to the **same value** as `CLIRA_ACCESS_KEY` you will create in Vercel (step 2). Use a long random string (>=40 characters). Example: `clira-vis26-9f7a3e42-8b92-4e36-9f60-6f0f7b0f7b42`
5. Save.

### 1.4 Deploy as a Web App
1. Click **Deploy → New deployment** (top right).
2. Click the gear icon next to "Select type" → choose **Web app**.
3. **Description:** `Visority Clira connector` (optional)
4. **Execute as:** `Me` (your Google account)
5. **Who has access:** `Anyone` 
   - This is required so Vercel's serverless function can reach it. The endpoint is **not public** without the `CLIRA_SHARED_SECRET`/`CLIRA_ACCESS_KEY`. Every `doGet`/`action:update` call requires that key.
6. Click **Deploy** → Google will ask you to authorise → Continue → Allow.
7. Copy the **Web App URL** (e.g. `https://script.google.com/macros/s/AKfycb.../exec`). Save this for Vercel.

> Note: If you re-deploy later, Google creates a new Web App URL. Update `CLIRA_SHEETS_URL` in Vercel when that happens.

---

## 2. Vercel environment variables

In [Vercel → Project → Settings → Environment Variables](https://vercel.com/docs/projects/environment-variables):

Add the following variables. Apply to **Production**, **Preview**, and **Development** (or at least Production + Preview).

| Key | Value | Notes |
|---|---|---|
| `CLIRA_ACCESS_KEY` | Same long random string used for `CLIRA_SHARED_SECRET` | >=40 chars. Server-side gate for `/api/clira-leads`. Browser sends this as `Bearer`/`X-Clira-Key`. |
| `CLIRA_SHEETS_URL` | The Web App URL from step 1.4 | e.g. `https://script.google.com/macros/s/AKfycb.../exec` |
| `PUBLIC_SITE_URL` | `https://www.visoritylive.com` (or your preview domain) | Already used by the funnel; safe to keep/set. |

Leave existing variables (`PAYSTACK_*`, `FUNNEL_SESSION_SECRET`, community links) unchanged.

---

## 3. First verification

### 3.1 Apps Script (read)
In a new browser tab (not logged into Google Apps Script), call:
```text
https://script.google.com/macros/s/<YOUR_WEB_APP_ID>/exec?key=<CLIRA_SHARED_SECRET>
```

Expected: `{ "ok": true, "columns": [...], "leads": [...], "syncedAt": "..." }`  
Without `key`: `{ "ok": false, "error": "Not authorised." }`

### 3.2 Local (demo)
```bash
npm run serve
# open http://localhost:3000/clira/
```
- Unlock card appears. Leave key blank? No — you must enter the `CLIRA_ACCESS_KEY` value to unlock (or set `CLIRA_SHEETS_URL` empty to test demo). With `CLIRA_SHEETS_URL` unset in `.env`, Clira serves synthetic data and shows the yellow "Showing synthetic sample records..." banner. Saves show "Saved for this session".

### 3.3 Production/Preview (live sheet)
1. Deploy to Vercel (Preview or Production).
2. Visit `https://<your-deploy>/clira/`
3. Enter `CLIRA_ACCESS_KEY` → dashboard loads live registrants.
4. Change a lead's status → sheet updates immediately. Add a note → `Last Note` and `Status Updated` update.
5. If an email appears twice in the sheet, the UI shows the ambiguity error and does **not** write to either row (by design).

---

## 4. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| 401 "Invalid Clira access key" | Mismatched `CLIRA_ACCESS_KEY` (Vercel) vs what you typed, or key not sent. | Re-type the exact key. Ensure same value as `CLIRA_SHARED_SECRET`. |
| 502 "sheet connector did not return valid JSON" | Web App returned HTML (often "This app isn't verified" or redirect). | Redeploy Web App with "Who has access: Anyone". Authorise again. First time some Google accounts see a consent screen — accept it. |
| 409 "Email ... appears on rows X,Y" | Duplicate emails in the sheet. | Deduplicate in the registration sheet (keep one row per registrant). Clira will never auto-merge to avoid writing to the wrong person. |
| 502 timeout | Apps Script cold start or slow sheet. | Retry (Clira shows "Try again"). Apps Script first call after inactivity can take ~1–3s. |
| Demo banner won't disappear | `CLIRA_SHEETS_URL` missing/incorrect in Vercel env. | Check Vercel env vars are set for that environment and redeploy. |
| Status/Note cells stay empty | `setupCliraColumns()` not run. | Run `setupCliraColumns()` once in Apps Script. |
| WhatsApp opens with no phone | Lead has empty `whatsApp` in sheet. | Fill the phone number in the sheet (or registration form). Action stays disabled until present. |

---

## 5. Notes

- The registration webhook (`doPost` original branch) is **byte-for-byte compatible** in behaviour. No risk to existing submissions.
- Write-back only touches `Follow-up Status`, `Last Note`, `Status Updated` for the matched row. It never edits registration fields.
- `LockService` protects both registration appends and Clira updates against concurrent writes.
- If you rotate the secret, update **both** `CLIRA_SHARED_SECRET` (Apps Script) and `CLIRA_ACCESS_KEY` (Vercel) at the same time.

**End of setup.**
