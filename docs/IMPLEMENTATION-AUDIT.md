# SpendSense implementation audit

## Scope inspected

Inspected the `SpendSense-PreFinal-Phases-1-5-JWT-v5.zip` workspace: mobile screens/services/navigation, Express routes/middleware, Mongoose models/validators, import parsers, Gemini services, Expo/npm configuration and existing status/check scripts.

## Baseline findings

| Area | Finding in supplied archive | Action in this update |
|---|---|---|
| Authentication | JWT login/register existed; app restored a placeholder cached user and did not validate token against the backend | Added `/api/auth/me`, real session restoration, cached profile, secure token/profile storage and logout clearing |
| Mobile transactions | Screen used `useDemoStore`; transaction API existed but was unused | Connected listing, create, edit and delete to authenticated APIs with React Query invalidation |
| Dashboard | Used hardcoded preview transactions, invented chart bars and preview labels | Connected monthly summary and lifetime net balance to backend data; chart bars now reflect category totals |
| Budgets | In-memory monthly budget only; backend budget route already existed | Connected category budgets to GET/upsert/DELETE APIs and calculated progress from stored transactions |
| Profile/accounts | Preview text and no sign-out; account APIs existed | Connected registered user details, sign-out, account create/list/archive, and statement upload entry point |
| AI | Backend/mobile service wrappers existed but not visible in a working UI | Added category suggestion, insights/recurring summary and chat interactions |
| Import parsing | Existing parser had a duplicate `const item` declaration; date parsing needed stronger validation; legacy path imported immediately | Removed duplicate declaration, added date validation, and added a user-owned preview/confirm import batch flow |
| Startup | Backend correctly used JWT and connected before listen; old documentation described obsolete Clerk-gated startup | Updated docs and checks to match current JWT startup |
| Test scripts | Smoke check asserted the old in-memory preview and Clerk-gated API | Rewrote smoke check for current persistent data flow |

## Current architecture

Mobile UI → service wrapper → Express route → JWT middleware → Mongoose → MongoDB Atlas.

All private financial routes derive `ownerUserId` from the verified JWT subject. Registration creates default categories for the new user. The dashboard summary now returns lifetime net balance alongside current-month totals and account opening balances. Optional transaction-to-account association and per-account balance calculations are wired.

## Known incomplete or unverified items

- Full package installation and dependency-backed typecheck were not possible in the isolated environment (npm install timed out before node_modules was created).
- Password reset is not implemented end-to-end; the UI explains that email delivery is not configured.
- SMS parsing accepts explicit message text only; no Android inbox/background SMS access.
- Scanned PDF OCR is not implemented.
- Account create/list/archive and balance reconciliation are wired. Opening balance creation/editing is not exposed in the Profile form; the backend schema supports it and defaults to zero.
- Category add/delete UI is present; category edit is API-only. Broad automated integration tests remain outstanding.
- Password reset is not implemented end-to-end. Profile reminder toggle is temporary UI state and has no push notification integration. Data export is not implemented.
- No live MongoDB, Gemini or Android runtime/device tests were run from this archive workspace.

Do not treat unverified items as production-ready.
