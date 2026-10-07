# PR: Prepare for release (blank state, security hardening, presence, announcements)

## Summary

This branch prepares MARS for release with a clean default state, relay hardening (security headers + rate limits), device presence tracking, an announcements UI, and a fix for SecureStore session size that was causing sign-outs.

- Default chats cleared (fresh install comes blank)
- Relay security headers + tightened AI rate limit
- Device presence endpoints (heartbeat + list) + mobile client
- Announcements banner in Recent Chats
- SecureStore chunking (fixes 2048 byte limit bug)

## Changes

### App/UI (mobile)
- `mobile/src/data/mockChats.ts` — emptied default chats (no seeded demo content)
- `mobile/src/screens/Home/HomeScreen.tsx` — adds `AnnouncementCard` above Recent Chats
- `mobile/src/components/AnnouncementCard.tsx` — reusable pinned announcement card
- `mobile/src/relay/presenceClient.ts` — `pingPresence()` and `getPresence()` helpers
- `mobile/app.json` — sets `assetBundlePatterns: ['**/*']` and ensures `fonts` array to reduce manifest warnings
- `mobile/src/components/buttons/*`, `mobile/src/theme/signInButtons.ts`, `mobile/src/screens/SignIn/SignInScreen.styles.ts` — UI sizing/consistency (Google/GitHub/Apple aligned)

### Auth/session (mobile)
- `mobile/src/auth/secureStoreAdapter.ts` — chunked writes (values >2048 bytes split into marker + chunks); fixes real Supabase sessions (~2.3KB) being silently dropped on Android
- `mobile/src/auth/secureStoreAdapter.test.ts` — updated to verify chunked round-trip

### Relay (mobile/relay)
- `mobile/relay/server.js` — adds security headers (X-Content-Type-Options, X-Frame-Options: DENY, HSTS preload, Permissions-Policy), device presence in-memory tracking (`Map<deviceId, {lastSeen, ip}>`), `POST /devices/presence`, `GET /devices/presence`, tightens `/fallback-chat` to 15/min (was 20/min), keeps existing 50/day per device and timing-safe checks

## Testing
- `cd mobile && npx tsc --noEmit` — clean
- `cd mobile && npx jest --maxWorkers=1 --silent` — 33 suites / 175 tests passed

## Notes / Tradeoffs
- Presence is in-memory (resets on relay restart). For multi-instance, move to Redis/Postgres. Current single-process relay is fine.
- mDNS peer discovery not added (cross-platform Expo complexity). QR-derived `deriveAgentConnection` + heartbeat covers stated needs.
- Endpoints cannot be hidden from APK inspection; authentication + per-endpoint rate limits + allowlists are the correct controls.

## What to do for Qwen API key (shareable)
You asked about using a Qwen API key so all users can call it. Current `/fallback-chat` uses **Groq** (`GROQ_API_KEY`). To switch to Qwen:

1. **Add env vars to relay** (`mobile/relay/.env` + hosting env):
   - `QWEN_API_KEY=sk-...`
   - `QWEN_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` (Qwen Chat Completions compatible)
   - `QWEN_MODEL=qwen-max` (or `qwen-plus/qwen-turbo` depending on quota)
   - `CHAT_PROVIDER=qwen` (toggle)

2. **Update `mobile/relay/server.js` fallback path**: replace Groq fetch with Qwen (OpenAI-compatible). Send `Authorization: Bearer ${QWEN_API_KEY}`, same message shape. Keep the same rate limits (15/min, 50/day) and usage counting.

3. **Shareable key considerations**: If you put a single shared key in the relay (server-side), all users share quota/cost and can be rate-limited together. Safer: per-user keys or quota caps + monitoring. Never put provider secrets in the mobile app (only relay). Also rotate key if abused.

4. **Hosting**: For "always online", run relay persistently (systemd/supervisor) or Supabase Edge Function. If you move to Supabase, secrets live in Project Settings → Secrets, not .env committed.

## Update button (deferred)
As requested, the "Update button" in the app will be done later. Common approaches when ready: Expo Updates (EAS Update) or in-app version check against a remote manifest + download (OTA). 

Co-authored-by: Contractor-x <dada4ash@gmail.com>