# Clerk migration plan — final phase only

JWT is the active authentication mechanism during Phases 1–5. Do not add a half-configured Clerk provider or make JWT routes depend on Clerk environment variables before this migration is deliberately started.

## Migration sequence

1. Create a Clerk development application and configure allowed origins, Android deep links and redirect URIs. Use an Expo development build for native OAuth testing; Expo Go browser redirects are not sufficient proof of a working native callback.
2. Define an auth-provider interface that resolves a verified identity to the stable SpendSense internal user ID. Avoid having every controller read a provider-specific claim directly.
3. Add a migration mapping between current Mongo `User._id` and the Clerk user ID. Do not replace `ownerUserId` without a reviewed migration plan.
4. Verify Clerk tokens on the backend and map each verified Clerk identity to the existing SpendSense user record.
5. Preserve `ownerUserId` on transactions, budgets, accounts, categories and import batches. Use a deterministic mapping table/field with unique indexes.
6. Migrate user credentials only through a supported secure account-linking/password-reset flow; never copy plaintext passwords or claim that bcrypt hashes are automatically portable to Clerk.
7. Update mobile session restore/sign-in/sign-out to Clerk SDK and keep all API requests using backend-verified bearer tokens.
8. Test multi-user isolation, account linking, deleted/disabled Clerk users, token expiry, deep links and rollback before releasing.
9. Remove JWT signing only after the Clerk identity mapping is proven and all active users can sign in. Keep migration logs without secrets.

## Migration acceptance criteria

- Existing transaction/budget/account/category/import ownership is preserved.
- No user can access another user's data after migration.
- Android Google OAuth returns to the app reliably in a development build.
- All private APIs verify Clerk tokens, not unsigned client claims.
- A rollback plan exists and is tested.
