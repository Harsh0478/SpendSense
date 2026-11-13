import fs from 'node:fs';
const required = [
  'server/src/routes/import.ts','server/src/routes/ai.ts','server/src/services/importParser.ts',
  'server/src/services/dedupe.ts','server/src/models/ImportBatch.ts','server/src/validators/ai.ts',
  'mobile/src/parser/smsParser.ts','mobile/src/features/import/importService.ts','mobile/src/features/ai/aiService.ts'
];
const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) { console.error('Missing Phase 4/5 files:', missing); process.exit(1); }
const server = fs.readFileSync('server/src/index.ts','utf8');
for (const route of ["'/api/import':importRouter", "'/api/ai':aiRouter"]) if (!server.includes(route)) throw new Error(`Route not mounted: ${route}`);
if (!server.includes('app.use(path,requireAuth,router)')) throw new Error('Phase 4/5 routes must be behind JWT auth middleware');
const env = fs.readFileSync('server/src/config/env.ts','utf8');
if (!env.includes('GEMINI_MODEL')) throw new Error('GEMINI_MODEL is not configured');
const ai = fs.readFileSync('server/src/routes/ai.ts','utf8');
if (!ai.includes('new GoogleGenAI')) throw new Error('Gemini server client is missing');
console.log(`Phase 4+5 JWT-protected structural checks passed (${required.length} files).`);
