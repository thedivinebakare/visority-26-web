# Ambassador referral release notes

## Implementation
- `server/ambassadors.cjs`: sole registry. VSR001 Eniola, VSR002 Deborah, VSR003 Divine. Add one entry for another ambassador.
- `api/ambassador.js`, `vercel.json`, `serve.mjs`: dynamic case-insensitive VSR + three-digit route. Redirects home with 302 and no-store. Invalid/inactive codes redirect without setting attribution; they do not erase an existing valid first touch.
- `server/referrals.cjs`: existing signed HttpOnly SameSite=Lax first-party cookie, 30 days. Secure on HTTPS, Domain=visoritylive.com on root/www. Only captures if no unexpired valid signed referral exists. Active codes rechecked on read.
- `server/sheets.cjs`: reads cookie at submission; ignores client ambassador/code fields. Resolves name from registry, adds canonical referralCode and ambassadorName. Signs email/code/name/submission time using REFERRAL_SHARED_SECRET or CLIRA_ACCESS_KEY. Existing legacy referral marker remains for compatibility/reconciliation.
- `GoogleSheetsWebhook.gs`: verifies signature with REFERRAL_SHARED_SECRET or CLIRA_SHARED_SECRET. Reuses equivalent headers or appends Referral Code and Ambassador after existing columns. Writes attribution in the same registration row. Does not reorder fields or change duplicate behavior.
- `server/clira.cjs`, `assets/js/clira.js`: map stored columns and add Referred by to existing detail answers. Unattributed rows show Direct / Unattributed. No new dashboard/filter/count feature.

## Google setup required before release
1. Back up current Apps Script source. Update the REGISTRATION deployment with the referral helper functions and modified registration append block from GoogleSheetsWebhook.gs. Preserve any newer status-saving changes in the online script; do not overwrite unrelated code blindly.
2. Confirm the script property CLIRA_SHARED_SECRET matches the existing server CLIRA_ACCESS_KEY. Alternatively configure REFERRAL_SHARED_SECRET identically on both sides; never put this in public code.
3. Deploy a new version through Deploy > Manage deployments > Edit > New version. Updating the current deployment preserves its exec URL. If creating a new deployment instead, set GOOGLE_SHEETS_WEBHOOK_URL to that URL in the server environment. The Clira read deployment must point to the SAME spreadsheet/tab.
4. No manual column creation is required: first registration appends missing referral headers safely while holding the existing lock.
5. Deploy application only after preview validation. Existing old script deployments can accept registration but ignore referral fields; API reports referralTrackingPending when the script has not acknowledged attribution. Do not count this as end-to-end live success.

## Validation performed
- qa-ambassador-attribution.cjs exercises the actual API and Apps Script code with an in-memory Sheet, then maps stored rows through Clira: VSR001/Eniola, VSR002/Deborah, VSR003/Divine; direct blank; invalid blank; case normalization; first touch; expiry; tampering; inactive registry entries; forged client name; column preservation.
- qa-ambassador-browser.mjs tests mobile vanity navigation, multi-page cookie persistence, first-touch, invalid fresh visitor, and referral text in the drawer with a synthetic API response.
- npm run build verifies production generation.
- No live registrations were submitted, no existing leads modified, and no production deployment performed. Live storage and Vercel rewrite behavior still require release verification.

## Existing behavior and limits
Registration currently appends rows rather than deduplicating them. This behavior is unchanged. Referral code is attached to each new registration row; it never creates a separate extra lead. Repeated submissions may therefore produce multiple rows as before. No performance counts have been added, so clicks/repeats cannot inflate a new displayed metric.

Existing selectedTier is preserved; Premium selection is not payment proof. Legacy premium webhook attribution behavior is retained; no revenue reporting added.

Only attribution-related code changed in this task. Homepage, SkillFund, registration UI, Clira authentication, timeouts, status saving, notes, and WhatsApp logic were not edited. Other pre-existing workspace changes are preserved.
