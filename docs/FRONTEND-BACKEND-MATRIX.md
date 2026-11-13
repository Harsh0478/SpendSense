# Frontend–backend connection matrix

| Feature | Mobile entry point | API | MongoDB | Current status |
|---|---|---|---|---|
| Register/login | `AuthScreen` | `/api/auth/register`, `/api/auth/login` | User | Connected in code; live test pending |
| Session restore/profile | `App.tsx`, Profile | `/api/auth/me` | User | JWT is verified at launch; profile/token cached in SecureStore |
| Transactions list/search | `TransactionsScreen` | `GET /api/transactions` | Transaction | Connected; text search and type filtering in UI; date/category server filters available |
| Add transaction | `AddTransactionScreen` | `POST /api/transactions` | Transaction | Connected; INR converted to paise, manual dedupe key, optional account association |
| Edit/delete transaction | `TransactionsScreen` | `PATCH/DELETE /api/transactions/:id` | Transaction | Connected in code; live test pending |
| Home summary | `HomeScreen` | `/api/summary/monthly` | Transaction + Account | Connected; includes monthly totals, lifetime net transaction balance and account opening balances |
| Category budgets | `BudgetsScreen` | `GET/POST/DELETE /api/budgets` | Budget + Transaction aggregate | Connected; category budgets are persisted and progress is calculated server-side |
| Accounts | Profile, Add Transaction | `GET/POST/PATCH/DELETE /api/accounts` | Account + Transaction | Create/list/archive, per-account balance, and optional transaction account selection connected |
| Categories | Profile, Add Transaction, Budgets | `/api/categories` | Category | Default seed, list, create and delete connected; categories used by transactions cannot be deleted; edit API exists without a dedicated UI |
| CSV/PDF import | Profile | `POST /api/import/preview`, `POST /api/import/:batchId/confirm` | ImportBatch + Transaction | Preview, sample rows, explicit confirmation and dedupe are implemented in code; requires live file/database test |
| SMS parsing | `mobile/src/parser/smsParser.ts` | No inbox ingestion route | None until explicitly imported | Parser works on supplied text only; no Android inbox/background SMS access |
| AI categorization | Add Transaction | `POST /api/ai/categorize` | Gemini; no automatic write | Connected as user-confirmed suggestion; requires Gemini key and live test |
| AI insights | Home | `GET /api/ai/insights` | User-scoped Transaction aggregation + Gemini | Connected in code; requires Gemini key and live test |
| Recurring candidates | Home | `GET /api/ai/recurring` | User-scoped Transaction aggregation | Heuristic candidate detection; no automatic transaction creation |
| AI chat | Home | `POST /api/ai/chat` | User-scoped summaries/recent transactions + Gemini | Connected in code; requires Gemini key and live test |
| Password reset | Auth screen | Not implemented end-to-end | — | UI clearly states email reset delivery is not configured; reset-token/email workflow remains incomplete |
| Reminder preference | Profile | Not connected | — | Toggle is temporary UI state only; no persisted preference or push notification is implemented |

All private APIs are mounted behind JWT middleware. Server-side ownership uses the verified token subject, not a client-supplied user ID. The account summary includes opening balances for active and archived accounts so archiving an account does not erase its contribution to historical net balance.

## Verification status

“Connected in code” means the mobile screen calls the corresponding service and the backend route exists. It does not imply a live MongoDB, Gemini, Android, or end-to-end test has passed in this workspace. See `TEST-REPORT.md` for exact verification limits.
