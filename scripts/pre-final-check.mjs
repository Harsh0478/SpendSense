import fs from 'node:fs';
const required = [
 'mobile/src/App.tsx','mobile/src/navigation/AnimatedFloatingTabBar.tsx','mobile/src/screens/HomeScreen.tsx',
 'mobile/src/screens/TransactionsScreen.tsx','mobile/src/screens/AddTransactionScreen.tsx','mobile/src/screens/BudgetsScreen.tsx','mobile/src/screens/ProfileScreen.tsx',
 'server/src/models/Transaction.ts','server/src/models/Account.ts','server/src/models/Category.ts','server/src/models/Budget.ts',
 'server/src/routes/transactions.ts','server/src/routes/accounts.ts','server/src/routes/categories.ts','server/src/routes/budgets.ts','server/src/routes/summary.ts',
 'server/src/routes/import.ts','server/src/routes/ai.ts','mobile/src/features/core/coreService.ts','mobile/src/features/import/importService.ts','mobile/src/features/ai/aiService.ts','mobile/src/parser/smsParser.ts',
 'docs/PHASE-1-STATUS.md','docs/PHASE-2-STATUS.md','docs/PHASE-3-STATUS.md','docs/PHASE-4-5-STATUS.md','docs/PRE-FINAL-STATUS.md','docs/IMPLEMENTATION-AUDIT.md','docs/FRONTEND-BACKEND-MATRIX.md'
];
const missing=required.filter(f=>!fs.existsSync(f));
if(missing.length){console.error('Missing files:',missing);process.exit(1);}
const server=fs.readFileSync('server/src/index.ts','utf8');
for(const route of ["'/api/transactions':transactionRouter","'/api/accounts':accountRouter","'/api/categories':categoryRouter","'/api/budgets':budgetRouter","'/api/summary':summaryRouter","'/api/import':importRouter","'/api/ai':aiRouter"]) if(!server.includes(route)) throw new Error(`Missing mounted route ${route}`);
if(!server.includes('app.use(path,requireAuth,router)')) throw new Error('Private routes are not JWT protected');
const mobile=JSON.parse(fs.readFileSync('mobile/package.json','utf8'));
if(mobile.dependencies['react-native-worklets']!=='0.13.0') throw new Error('Unexpected react-native-worklets version');
if(mobile.dependencies['expo-document-picker']!=='~58.0.4') throw new Error('Unexpected expo-document-picker version');
if(mobile.dependencies['expo-secure-store']!=='~58.0.2') throw new Error('Unexpected expo-secure-store version');
if(mobile.dependencies['@clerk/expo']) throw new Error('Clerk should be deferred to final phase');
console.log(`Pre-final Phase 1–5 structural check passed (${required.length} required files and 7 protected API route groups).`);
