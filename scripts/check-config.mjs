import fs from 'node:fs';
import path from 'node:path';
const files = ['package.json','mobile/package.json','mobile/app.json','mobile/tsconfig.json','server/package.json','server/tsconfig.json','packages/shared/package.json'];
for (const file of files) { JSON.parse(fs.readFileSync(file, 'utf8')); console.log(`OK JSON ${file}`); }
const forbidden = ['mobile/src/App.tsx','mobile/src/screens/ProfileScreen.tsx'];
for (const file of forbidden) {
  const text = fs.readFileSync(file, 'utf8');
  if (/from ['"]@clerk\//.test(text) || /EXPO_PUBLIC_CLERK/.test(text)) throw new Error(`Clerk is still wired into Phase 2: ${file}`);
}
const pkg = JSON.parse(fs.readFileSync('mobile/package.json','utf8'));
if (pkg.dependencies['react-native-worklets'] !== '0.13.0') throw new Error('react-native-worklets must stay at 0.13.0 for the previously fixed Reanimated peer dependency');
if (pkg.dependencies['@clerk/expo']) throw new Error('Clerk must remain deferred until the final phase');
console.log('OK Phase 2 dependency and auth-boundary checks');
