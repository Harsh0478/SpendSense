# SpendSense

Android-first personal finance application built with React Native (Expo), TypeScript, Express, MongoDB Atlas and Google Gemini.

## Current implementation

The current workspace uses JWT email/password authentication for development. Access tokens are stored with Expo SecureStore, verified by Express middleware, and restored against `GET /api/auth/me`. The final Clerk migration remains intentionally deferred.

The five-tab purple fintech UI and animated floating navigation are retained. The Home screen, Transactions screen, Add Transaction screen, Budgets screen and Profile screen are now wired to authenticated APIs instead of the former in-memory demo store. Transactions and budgets are stored in MongoDB; dashboard totals are calculated on the backend. The Profile screen supports account creation/archive and CSV/PDF statement upload. The Home screen exposes Gemini insights, recurring-payment candidates and the AI chat service. The Add Transaction screen exposes AI category suggestions.

Phase 4/5 backend foundations include CSV and text-PDF parsing, user-scoped deduplication, import batch records, a selected-message SMS parser, Gemini categorization/insights/chat and heuristic recurring-payment candidates.

## Requirements

- Node.js 22+
- MongoDB Atlas database and network access configured
- Android development build for native device testing
- Gemini API key for AI features

## Publish future updates
Whenever you change your app's UI, screens, or TypeScript logic, run:

eas update --channel preview --message "SpendSense improvements"

## Install

Run from the repository root:

```bash
npm install
npm run check:config
npm run check:smoke
npm run check:phase45
npm run check:pre-final
npm run typecheck
```

Then install/verify Expo-compatible native dependencies:

```bash
cd mobile
npx expo install --check
npx expo-doctor
```

## Environment

Copy `server/.env.example` to `server/.env` and configure `MONGODB_URI`, `JWT_SECRET`, and optionally `GEMINI_API_KEY`.

Copy `mobile/.env.example` to `mobile/.env` and configure `EXPO_PUBLIC_API_BASE_URL`:

- Android emulator: `http://10.0.2.2:4000`
- Physical Android phone: `http://<computer-LAN-IPv4>:4000`

For a physical phone, the phone and computer must be on the same reachable network. Allow port 4000 through Windows Firewall if prompted. Restart Expo after changing the environment file.

Generate a JWT secret locally, do not share it:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Never commit `.env` files or put MongoDB/JWT/Gemini secrets in Expo public variables.

## Run locally

From the repository root:

```bash
npm run dev:server
```

In a second terminal:

```bash
npm run dev:mobile
```

Use the project's Android development client. The backend health endpoint is `GET http://<host>:4000/health`; a response of `Cannot GET /` at the root path is expected because no root route is defined.

## Key APIs

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET|POST /api/transactions`, `GET|PATCH|DELETE /api/transactions/:id`
- `GET|POST /api/accounts`, `PATCH|DELETE /api/accounts/:id` (DELETE archives)
- `GET|POST /api/categories`, `PATCH|DELETE /api/categories/:id`
- `GET|POST /api/budgets`, `DELETE /api/budgets/:id`
- `GET /api/summary/monthly?month=YYYY-MM`
- `POST /api/import/statement`
- `POST /api/ai/categorize`, `GET /api/ai/insights`, `POST /api/ai/chat`, `GET /api/ai/recurring`

All routes except registration/login and health require `Authorization: Bearer <JWT>` (the `/api/auth/me` route is also JWT-protected). Money values sent to the backend use integer paise; the UI accepts rupees and converts them before sending.

## Known limitations and release gates

- The full npm installation and dependency-backed typecheck were not completed in the isolated workspace used to prepare this archive. Run them on the development machine before trusting a build.
- Password reset currently displays an honest setup notice; email delivery and secure reset-token workflow still require an email provider and dedicated implementation.
- Statement upload currently parses and imports supported rows in one server request. It reports imported/duplicate/skipped counts, but a transaction preview/approval step is not yet implemented.
- PDF support is text-based only. Scanned/image-only PDFs require OCR, which is not claimed here.
- SMS parsing is for message text explicitly provided by the user. The app does not read the SMS inbox or run background SMS capture. Native notification/SMS access needs a separate Android permission and policy review and a development build.
- Recurring-payment results are heuristic candidates, not confirmed subscriptions or payment instructions.
- Account create/list/archive is available in Profile; full account balance reconciliation with transaction-linked account IDs is not yet implemented.
- Account/category/budget integration tests, multi-user isolation tests against a real test database, and Android runtime/device tests remain required.
- Clerk/Google OAuth migration is deferred to the final phase; use a development build when implementing and testing native OAuth callbacks.

See `docs/IMPLEMENTATION-AUDIT.md`, `docs/FRONTEND-BACKEND-MATRIX.md`, `docs/BUG-FIX-REPORT.md`, `docs/TEST-REPORT.md`, and `docs/CLERK-MIGRATION-PLAN.md` for details.
