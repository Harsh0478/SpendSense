# SpendSense Pre-Final v4 (Phases 1–5)

## Changes in this correction
- Added JWT email/password registration and login endpoints.
- Added bcrypt password hashing (12 rounds) and JWT verification middleware.
- Added mobile login/registration screen and SecureStore token persistence.
- Enabled protected APIs using JWT instead of Clerk during development.
- Changed data ownership field to `ownerUserId` across MongoDB models and API queries; JWT `sub` is the owner identifier. Clerk migration should preserve this stable ownership mapping.
- MongoDB is now connected during startup independently of Clerk. Startup fails clearly when Mongo URI or JWT secret is missing.
- Retained prior SMS parser null-guard, PDF parser type declaration, date parser guards, Expo document picker version `~58.0.4`, and `react-native-worklets` `0.13.0` fixes.

## Required server environment
`server/.env`:
```
PORT=4000
MONGODB_URI=your_mongodb_atlas_uri
JWT_SECRET=replace_with_a_random_secret_at_least_32_characters
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-3.8-flash
CORS_ORIGIN=*
```
Do not commit `.env`. Use a unique random JWT secret. For production, configure exact CORS origins, HTTPS, refresh-token rotation/revocation, password reset delivery, email verification and security review.

## Known limitations — not represented as complete
- This is a pre-final development package, not a production-ready financial application.
- JWT currently uses a single signed bearer token; refresh-token rotation and server-side revocation are not implemented.
- Password reset and email verification delivery are not implemented.
- Google OAuth is deferred to Clerk migration.
- Some mobile feature screens still use preview/demo state; not every screen is fully wired to every API.
- Import and AI routes require real environment credentials and end-to-end testing.
- No full dependency install, Android build, live Atlas test, or Gemini integration test was run while producing this archive.
- Keep the prior local TypeScript fixes: `smsParser.ts` amount capture guard; `server/src/types/pdf-parse.d.ts`; and explicit guards for PDF date parser captures.

## Important dependency compatibility
- Keep `react-native-worklets` at `0.13.0` with Reanimated 4.7.1.
- Keep Expo document picker at `~58.0.4` (the previously encountered unavailable `~58.0.8` must not be restored).
- Do not add broad npm overrides for React/React DOM; the app previously ran without them.


## v5 dependency correction
- Corrected `expo-secure-store` from unavailable `~58.0.6` to Expo SDK 58 recommended `~58.0.2`.


## Gemini 3.8 update (2026-11-12)
- Updated the documented Gemini model to `gemini-3.8-flash`; see `docs/GEMINI-MODEL-MIGRATION.md` for local `.env` update and restart steps.
