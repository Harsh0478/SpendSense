# SpendSense feature upgrade

## Smart Bill Calendar
- MongoDB-backed bills with title, category, amount, due date, recurrence and per-bill reminder lead days.
- Added a month grid with bill-date markers, date filtering, overdue/today/due-soon states and an upcoming bill list.
- Marking a bill paid now creates a corresponding expense transaction and advances a recurring bill's next due date (or marks a one-time bill paid).
- Bill transaction creation and recurrence update run in one MongoDB transaction; stale/double-tapped calendar items are rejected using the expected due date and deterministic dedupe key.
- Reminder lead time currently drives in-app due/overdue status. OS push/local notification scheduling is not implemented in this build.

## Loan and EMI Manager
- Tracks lender, loan type, principal, outstanding amount, annual rate, EMI, due day, next due date and remaining instalments.
- Records EMI payments as expense transactions and updates the outstanding balance/installment count in one MongoDB transaction.
- Prevents duplicate payments for the same loan/date/amount through the transaction's unique owner/dedupe-key index.
- Uses a due-day-clamped next-month date calculation to avoid dates such as March 3 after a January 31 EMI.
- Estimates monthly interest from the current outstanding principal and annual rate; users should reconcile this estimate against their lender's amortization statement.

## Unusual Spending Detection
- Compares current-month category expense run-rate with the average of the prior three complete calendar months.
- Flags categories where projected month-end spend is at least 50% and ₹500 above baseline, with current spend of at least ₹500.
- Shows current spend, projected spend, baseline and percentage increase on Home.
- This is an explanatory spending-pattern signal, not a fraud detector or a guarantee of future spending.

## Gemini AI enhancements
- Insights now include month-over-month expenses, category totals, budget utilisation, upcoming/overdue bills and active loan/EMI obligations.
- Chat context includes current-month totals, previous-month expenses, category spending, recent transactions, budget progress, upcoming/overdue bills, active loans and recurring-payment candidates.
- Prompts treat transaction fields and user-provided text as untrusted data, require data-grounded INR answers, disclose estimates and prohibit payment actions or credential requests.
- Gemini API key remains server-side; the mobile app calls the authenticated Express API only.

## November 13 UI fixes
- Transaction date now opens an in-app month calendar with previous/next month navigation, Today shortcut, and selected-date highlighting; no native date-picker dependency is required.
- Profile personal information can be edited (name and email). The authenticated `PATCH /api/auth/me` endpoint validates input, prevents duplicate email addresses, and updates the secure cached session profile.
- Budget reminder thresholds are configurable per category (50%, 75%, 80%, 90%, or 100%). The Budgets screen displays an in-app reminder when spending reaches the selected threshold. These are in-app reminders; Android push notifications are not included.
