# SpendSense feature upgrade (JWT edition)

Based on `SpendSense-Monthly-Spending-Fix.zip`. The existing JWT login and registration flow is preserved; Clerk is not used.

## Added
- Smart bill calendar with recurring bills, reminder lead-days and paid-bill ledger entries. Reminders are currently in-app; native scheduled notifications are not included.
- Loan and EMI manager with payments recorded as debit transactions.
- Unusual spending signals comparing projected current-month category spend with the previous three complete months. These are not fraud alerts.
- Gemini context expanded with budgets, bills, loans, month comparisons and recurring payment candidates.

## Setup
1. Keep your existing `server/.env` and `mobile/.env`; do not overwrite them with examples.
2. Run `npm install` from the project root.
3. Run `npm run check:feature-upgrade` and the existing project checks.
4. Start the API and mobile app using your existing JWT setup.

Bill and EMI payments use MongoDB transactions; MongoDB Atlas supports transactions.
