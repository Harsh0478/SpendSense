# SpendSense — Phase 4 + Phase 5

## Phase 4 — imports

- Authenticated CSV/PDF statement upload endpoint (`POST /api/import/statement`).
- CSV column mapping for common bank statement headings.
- Conservative text-based PDF row parser.
- SHA-256 deduplication key and user-scoped bulk upsert.
- Import batch metadata and imported/duplicate/skipped counts.
- Mobile document-picker upload entry point from Profile.
- Pure TypeScript parser for message text explicitly supplied by the user, with common Indian bank sender recognition and conservative OTP/promotion/failure/reversal exclusions.
- Parser date normalization validates DD/MM/YYYY-style values and rejects invalid calendar dates.

## Phase 5 — Gemini AI

- Backend-only Gemini client; API key never goes into the mobile bundle.
- Zod-validated transaction categorization response, exposed as an optional suggestion in Add Transaction.
- User-scoped monthly aggregation and generated insight strings, shown on Home.
- Heuristic recurring-payment candidates across at least two distinct calendar months, shown on Home as possible matches rather than confirmed subscriptions.
- Chat endpoint passes only the authenticated user's aggregate/recent transaction context; the Home screen exposes the chatbot.
- Mobile typed AI service functions with a server-side API key requirement.

## Explicit limitations

- Clerk is intentionally deferred to the final phase. The current Phase 1–5 build uses JWT; all import and AI endpoints are mounted behind JWT middleware.
- Import currently parses and inserts rows in one action. A separate user-visible row preview/approval workflow is not yet implemented.
- The SMS parser only parses text explicitly supplied by the user. It does not read the inbox, request READ_SMS/RECEIVE_SMS, or run background collection.
- PDF parsing supports text-based statements only. Scanned/image-only PDFs require OCR; no OCR is claimed.
- Bank statement formats vary. CSV mapping and PDF parsing are heuristic/conservative; inspect import outcomes and reconcile statements before relying on them.
- Import size is capped at 8 MB and 5,000 detected rows.
- AI requires a working `GEMINI_API_KEY` on the server. AI categorization is a suggestion; recurring candidates are heuristic only.

## Verification

Run `npm install`, static repository checks, `npm run typecheck`, and then integration tests against a non-production MongoDB database. Also test the Gemini paths with a development key and Android flows on a development build. No such live checks were run in the isolated archive-preparation environment.
