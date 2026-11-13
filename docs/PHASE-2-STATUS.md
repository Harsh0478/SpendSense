# SpendSense — Phase 2 UI and authentication

## Current implementation

- JWT email/password registration and login; confirm-password and basic form validation.
- JWT token and cached user profile stored using Expo SecureStore.
- Session restored by validating the token against the protected `/api/auth/me` route.
- Sign-out clears token/profile and React Query caches.
- Welcome screen shown after a new registration, not on every restored session.
- Home, Transactions, Add Transaction, Budgets and Profile screens retain the supplied purple fintech design language.
- Five-tab animated floating navigation with Reanimated spring motion and haptic selection retained.
- Mobile financial screens are wired to the server-backed transaction, summary and budget APIs rather than `demoStore`.
- Profile displays the registered user and supports account create/list/archive plus statement import entry point.

## Current limitations

- Password reset UI communicates that email delivery is not configured; secure reset tokens and outbound email still need implementation.
- Budget reminder toggle is currently a local preference control; no push notification scheduler is configured.
- The account screen is a compact Profile section; transaction-linked account selection and account balance reconciliation are still outstanding.
- Full dependency-backed typecheck and Android runtime verification must be run locally.

## Compatibility fixes preserved

- Reanimated peer compatibility: `react-native-worklets` stays pinned at `0.13.0`.
- `expo-document-picker` remains `~58.0.4` and `expo-secure-store` remains `~58.0.2`.
- TypeScript config avoids deprecated `baseUrl`.
- Clerk OAuth remains deferred until the final phase and a correctly configured native development build.
