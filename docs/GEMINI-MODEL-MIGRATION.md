# Gemini model migration

SpendSense now defaults to Google's stable Gemini 3.8 Flash model (`gemini-3.8-flash`). The previous `gemini-2.5-flash` value returned a 404 for the API key/project shown during testing.

## Update the local backend environment

Open `server/.env` and set:

```env
GEMINI_MODEL=gemini-3.8-flash
GEMINI_API_KEY=your_existing_google_ai_studio_api_key
```

Keep the existing API key private. Do not put it in `mobile/.env` or any `EXPO_PUBLIC_` variable.

Then stop and restart the backend:

```powershell
cd "D:\Language\Resume Project\SpendSense\server"
# Stop the existing process with Ctrl+C, then:
npm run dev
```

The backend reads `.env` at process startup. A restart is required after changing `GEMINI_MODEL`.

## What changed in source

- `server/src/config/env.ts`: default model is `gemini-3.8-flash`.
- `server/.env.example`: documented model is `gemini-3.8-flash`.
- `server/src/routes/ai.ts`: both AI chat and structured JSON generation use the configured model; legacy sampling `temperature` has been removed for Gemini 3 compatibility. Model errors are converted into a readable API message.
- `mobile/src/screens/HomeScreen.tsx`: AI errors are no longer always mislabeled as missing `GEMINI_API_KEY`.

## Verify

After backend restart, reopen Home and ask SpendSense AI a simple question. If it still fails, inspect the backend terminal for `[GEMINI] Provider request failed` and check API key access, quota and enabled API/project. Never paste the key into chat.
