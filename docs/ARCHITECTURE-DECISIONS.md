# Architecture decisions — v0.1

## Persistence

MongoDB Atlas is the only application database, as required by the latest master brief. Mobile screens access data through the Express API only. No SQLite, Realm, Firebase, Supabase, PostgreSQL or direct mobile-to-MongoDB access is introduced.

**Trade-off:** Without a local database, fully offline transaction history and durable offline writes are not supported in this phase. The app can retain only transient in-memory UI/query state. Revisit this constraint if offline-first operation becomes mandatory.

## Authentication

Use the current Clerk Expo SDK package (`@clerk/expo`) on mobile and `@clerk/express` on the API. The user's identity is always taken from the verified Clerk session, never from request body fields.

## Animation

Use React Navigation's real tab state as the source of truth. Reanimated moves one shared active indicator to the selected tab position; tab presses trigger native haptic selection feedback where available.

## Android import compliance

SMS permissions remain out of the first foundation build. CSV, PDF and manual imports are the safer baseline. Any SMS/notification import will be gated behind a policy and permission review and explicit in-app consent.
