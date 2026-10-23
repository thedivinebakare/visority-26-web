# Ambassador attribution implementation plan

Goal: VSR001–003 → existing registration → appended Sheet attribution → Clira detail.

- Add one server registry; resolve canonical active codes.
- Extend existing signed referral cookie to local registry, preserving legacy integration and first valid touch for 30 days.
- Route case-insensitive VSR### paths through one resolver, redirect home without cache.
- Resolve attribution from signed cookie during registration, never trust browser-provided ambassador names.
- Sign the attribution sent to Apps Script using its existing shared secret; append Referral Code and Ambassador columns without reordering registration or follow-up columns.
- Display stored referral in Clira details only. No auth, saving, notes, or message changes.
- Test cookies, invalid/inactive/expired/tampered codes, all three ambassadors, direct traffic, spoofing and Sheet storage using an in-memory Apps Script test harness.
- Document Google deployment requirement. No production deployment in this task until full live flow can be verified.
