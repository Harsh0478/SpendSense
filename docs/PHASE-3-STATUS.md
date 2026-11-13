# SpendSense — Phase 3: Persistent core backend

## Implemented in the current workspace

- MongoDB models for users, transactions, accounts, categories, budgets and import batches.
- JWT-authenticated transaction CRUD with user scoping, pagination, date range, type, category and text filters.
- Account create/list/update/archive endpoints and Profile UI for create/list/archive.
- Category create/list/update/delete endpoints; registration seeds default categories for new users.
- Monthly category budget API with upsert/delete behavior and spend totals from debit transactions; Budgets screen uses those APIs.
- Monthly dashboard summary with month-to-date income/expenses/net, category breakdown, recent transactions and all-time net balance; Home screen is API-connected.
- Mobile services use the configurable API base URL, JWT from SecureStore and React Query invalidation after mutations.
- Money values are stored and transmitted as integer paise; mobile forms accept rupees and convert before sending.

## API routes

- `/api/transactions` — GET/POST; `/:id` GET/PATCH/DELETE.
- `/api/accounts` — GET/POST; `/:id` PATCH/DELETE (DELETE archives).
- `/api/categories` — GET/POST; `/:id` PATCH/DELETE.
- `/api/budgets` — GET with `?month=YYYY-MM`, POST upsert, `/:id` DELETE.
- `/api/summary/monthly?month=YYYY-MM` — authenticated dashboard aggregation.

All private APIs require a verified JWT. The owner ID is derived from the JWT subject; it is not accepted from the mobile request body.

## Remaining validation

- Account opening balances are not yet reconciled into the all-time dashboard balance and transaction-account links are not surfaced in the Add Transaction UI.
- Dedicated category management UI remains outstanding (default categories are seeded and served; create/update/delete APIs exist).
- Automated API integration and cross-user isolation tests against a disposable MongoDB database remain required.
