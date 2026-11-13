# SpendSense local setup (Windows / Android)

## 1. Prerequisites

Install Node.js 22+, Git (optional), Android Studio/SDK, and create a MongoDB Atlas database. For Gemini features, obtain a server-side Gemini API key.

## 2. Install dependencies

From the `SpendSense` root:

```powershell
npm install
```

## 3. Configure the backend

Copy `server/.env.example` to `server/.env`. Set:

- `MONGODB_URI` to the Atlas connection string.
- `JWT_SECRET` to a locally generated random value of at least 32 characters.
- `GEMINI_API_KEY` if AI features should be active.
- `CORS_ORIGIN=*` for local development (tighten for deployment).

Generate a secret without pasting it into chat:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

In Atlas, allow the computer's current public IP in Network Access, create a database user with least-privilege access, and URL-encode special characters in credentials in the URI.

## 4. Configure mobile API URL

Copy `mobile/.env.example` to `mobile/.env`.

- Android emulator: `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:4000`
- Physical phone: use the computer's Wi-Fi IPv4 address, e.g. `http://192.168.1.25:4000` (replace with the actual current address).

Find the Windows address with `ipconfig`. The Android phone and computer need to be on the same reachable network. Allow Node.js/port 4000 through Windows Firewall. Do not use `localhost` for the physical device.

## 5. Start server

In terminal 1:

```powershell
npm run dev:server
```

Expected output includes MongoDB connected and API listening on port 4000. Verify `http://<host>:4000/health` from the phone/browser. The root `/` route is not defined; `Cannot GET /` at root is not a server-health failure.

## 6. Start mobile

In terminal 2:

```powershell
npm run dev:mobile
```

Use the installed Expo development client. After editing `.env`, stop Expo and restart with cache clear:

```powershell
cd mobile
npx expo start --dev-client --clear
```

## 7. Checks

From project root:

```powershell
npm run check:config
npm run check:smoke
npm run check:phase45
npm run check:pre-final
npm run typecheck
```

Then in `mobile`:

```powershell
npx expo install --check
npx expo-doctor
```

## 8. Android build

A native development build is needed for native modules and future OAuth/SMS/notification features:

```powershell
cd mobile
npx expo prebuild --platform android
npx expo run:android
```

Do not test production bank data until authentication, database ownership/isolation, parsing and device privacy have been reviewed.

### Android phone registration/login network check

For a physical Android phone, set `EXPO_PUBLIC_API_BASE_URL` in `mobile/.env` to the Windows PC's current Wi-Fi IPv4 address, for example `http://192.168.1.25:4000`. Do not use `localhost` or the Android-emulator-only `10.0.2.2` address on a physical phone. Before testing registration, open `http://<PC-LAN-IP>:4000/health` in the phone browser and confirm it returns JSON containing `ok: true`. Restart Expo with `npx expo start --clear` after changing the mobile environment file.

Registration can take longer than login while the server creates the user and default categories, so the mobile auth request allows up to 45 seconds for registration. If it times out, the user record might already have been written; try logging in with the same email before trying to register again.
