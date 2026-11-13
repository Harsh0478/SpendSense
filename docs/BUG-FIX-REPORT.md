# SpendSense bug-fix report

## Fixes applied in this update

1. **Demo transactions remained in production screens.** Replaced `useDemoStore` in Home, Transactions, Add Transaction, Budgets and Profile with API-backed services and React Query.
2. **Add Transaction only changed in-memory state.** It now sends a POST request, includes a unique manual idempotency key, and refreshes transaction, summary, budget and AI query caches only after the API confirms success.
3. **Transaction list/delete were local-only.** List, edit and delete now call authenticated transaction APIs; query caches refresh after mutations.
4. **Budget settings reset on restart.** Budget listing, upsert and deletion now use the existing MongoDB-backed budget endpoints.
5. **Dashboard displayed illustrative values.** Income, expense, lifetime net balance, recent activity and category chart bars now derive from the summary API.
6. **Session restoration used a fake cached user.** Added authenticated `/api/auth/me`; app verifies the token on startup and caches user metadata in SecureStore. Temporary connectivity failures no longer automatically erase a stored token/profile.
7. **No mobile logout path.** Added confirmation and SecureStore token/profile clearing, plus React Query cache clearing.
8. **Profile contained preview-only copy.** Replaced with account details, account create/list/archive and statement import actions.
9. **Auth request could hang and lacked registration confirmation.** Added a 15-second timeout, client-side email/password checks and confirm-password validation.
10. **No visible AI actions.** Added AI category suggestion, Home insights/recurring-payment display and AI chat UI using existing backend service wrappers.
11. **Import parser duplicate declaration.** Removed duplicate `const item` declaration from `server/src/services/importParser.ts`.
12. **Import date parsing could accept invalid calendar values.** Added validation for Indian DD/MM/YYYY/DD-MM-YYYY dates and invalid day/month combinations.
13. **Duplicate transaction API errors were generic.** Backend now maps a unique dedupe-key conflict to `DUPLICATE_TRANSACTION`; mobile shows a clear message.
14. **Account list included archived accounts.** Account listing now filters archived records.
15. **Old smoke script tested obsolete preview/Clerk-gated design.** Replaced with assertions for JWT session, persistent API wiring, demo store removal and import parser duplicate regression.
16. **Environment example described Clerk-only auth.** Updated server template to JWT_SECRET and current Gemini/MongoDB configuration.

## Previous fixes preserved

- `react-native-worklets` remains pinned at `0.13.0` for the Reanimated 4.7.x peer requirement.
- `expo-document-picker` remains `~58.0.4`.
- `expo-secure-store` remains `~58.0.2`.
- TypeScript path mapping does not use deprecated `baseUrl`.
- SMS parser checks regex capture group presence before use.
- `pdf-parse` declaration file remains in `server/src/types/pdf-parse.d.ts`.
- JWT middleware verifies Bearer tokens and maps `sub` to `authUserId`.
- MongoDB connection is required and completed before the Express listener starts.
- Mobile API uses configurable `EXPO_PUBLIC_API_BASE_URL`; physical Android devices must use a reachable LAN address rather than localhost.

## Verification constraints

`npm install` timed out in this isolated workspace; it did not create `node_modules`. Therefore dependency-backed TypeScript checks, real database tests, live Gemini requests and Android runtime/build tests remain unverified here.

17. **Statement import lacked a review step.** Added a user-owned preview batch, explicit confirmation endpoint, visible row preview in Profile and cache refresh after confirmed import.
18. **Account association was not available during manual entry.** Added optional active-account selection and server ownership validation for supplied account IDs.
19. **Account totals were not shown or included in dashboard balance.** Account APIs now compute per-account opening balance plus linked credits/debits; Profile displays each account balance and dashboard balance includes all opening balances.
20. **Android device binding needed to be explicit.** Express now listens on `0.0.0.0` so a physical device can reach the development server over the LAN (subject to firewall/network rules).
21. **Unused demo store remained in the source tree.** Removed the unreferenced `demoStore.tsx` file and updated configuration checks; production screens contain no `useDemoStore` references.

### Registration fetch cancellation (2026-11-12)

- Increased the registration request timeout to 45 seconds and login to 25 seconds.
- Added explicit handling for AbortError/CanceledError variants returned by React Native fetch.
- Improved non-JSON/empty server response reporting.
- On registration timeout, the user is told to attempt login first because the server may already have created the account before the client lost the response.
- Added physical Android device LAN-IP and `/health` verification instructions to the setup guide.


## Gemini model migration (2026-11-12)
- Replaced the unavailable `gemini-2.5-flash` default with the currently listed stable `gemini-3.8-flash` model.
- Updated `server/.env.example` and `server/src/config/env.ts` so fresh setups use the same model.
- Removed legacy `temperature` generation settings from Gemini 3 requests.
- Added backend error normalization so model-not-found errors return a clear configuration message instead of raw provider JSON.
- Updated the Home screen to display the actual AI API error rather than incorrectly assuming every AI failure means `GEMINI_API_KEY` is missing.
- Important: update the real `server/.env` file as well; changing `.env.example` does not change an already-existing local environment file.

## Monthly spending chart correction (2026-11-12)
- Replaced the unlabeled flexible vertical columns on the Home dashboard with a readable top-category breakdown: category name, amount in INR, share of monthly expenses, and a proportional horizontal bar.
- This fixes the one-category case where a single flex column expanded across the entire chart area and looked like a large blank purple rectangle.
- Added `expenseCount` to `/api/summary/monthly`; the dashboard now labels the count as expenses rather than counting credits and debits together under a monthly-spending card.
- Corrected singular/plural category labels (`1 category`, `2 categories`).
