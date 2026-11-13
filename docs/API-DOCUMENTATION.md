# SpendSense API overview

Base URL: `http://<host>:4000`

`GET /health` is public. All `/api/*` routes require `Authorization: Bearer <JWT>` except registration and login. `GET /api/auth/me` is protected.

## Authentication

- `POST /api/auth/register` — `{ name, email, password }`
- `POST /api/auth/login` — `{ email, password }`
- `GET /api/auth/me` — returns the authenticated `{ id, name, email }`

Passwords are bcrypt-hashed. JWT subject (`sub`) contains the user ID.

## Transactions

- `GET /api/transactions?page=1&limit=50&type=DEBIT&category=Food&q=market&from=2026-11-01&to=2026-11-30`
- `GET /api/transactions/:id`
- `POST /api/transactions`
- `PATCH /api/transactions/:id`
- `DELETE /api/transactions/:id`

Create body: `{ amountPaise, type, merchant, category, occurredAt, source?, upiRef?, note?, tags?, dedupeKey }`. `amountPaise` must be a positive integer. The server sets `ownerUserId` from the JWT. A duplicate dedupe key for the same owner produces HTTP 409 with `DUPLICATE_TRANSACTION`.

## Accounts

- `GET /api/accounts`
- `POST /api/accounts` — `{ name, type, institution?, openingBalancePaise? }`
- `PATCH /api/accounts/:id`
- `DELETE /api/accounts/:id` — archives the account (not a hard delete)

## Categories

- `GET /api/categories`
- `POST /api/categories` — `{ name, type?, icon?, color? }`
- `PATCH /api/categories/:id`
- `DELETE /api/categories/:id`

Default categories are seeded for new user registrations and cannot be edited or deleted through these routes.

## Budgets

- `GET /api/budgets?month=YYYY-MM`
- `POST /api/budgets` — `{ category, limitPaise, month, alertAtPercent? }`; acts as an upsert by owner/category/month.
- `DELETE /api/budgets/:id`

The GET response includes `spentPaise` calculated from debit transactions for that category/month.

## Summary

- `GET /api/summary/monthly?month=YYYY-MM`

Returns current-month income/expense/net/transaction count/category breakdown/recent transactions plus all-time net `balancePaise`.

## Import

- `POST /api/import/preview` — multipart form with field `file`; accepts `.csv` or text-based `.pdf`, up to 8 MB and 5,000 parsed rows. It stores a user-owned preview batch and returns up to 100 rows for review.
- `POST /api/import/:batchId/confirm` — confirms the preview and bulk-upserts rows using user-scoped dedupe keys.
- `POST /api/import/statement` — legacy direct-import endpoint retained for API compatibility; the mobile UI uses preview/confirm.

## Gemini AI

- `POST /api/ai/categorize` — `{ merchant, amountPaise, type }`
- `GET /api/ai/insights`
- `POST /api/ai/chat` — `{ message }`
- `GET /api/ai/recurring`

Gemini calls require `GEMINI_API_KEY` on the server. The AI routes use only transactions associated with the authenticated user. Recurring results are heuristic candidates.
