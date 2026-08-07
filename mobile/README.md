# MARS Mobile — Phase 14 Stage 2 (React Native + Expo)

The production mobile app for MARS. This is a **remote control** for the embedded
agent running on the user's desktop peer: the phone has no QUIC endpoint, does not
register with the rendezvous server, and talks HTTPS to the desktop peer's
Phase 4 REST API (port `40003`) with Bearer-token auth.

> Only Stage 2 is implemented here (React Native + Expo). The Stage 1 PWA lives
> separately and shares the same API contract and screen structure.

## Stack

- **Expo SDK 54** / React Native 0.81 / React 19.1 / TypeScript (strict)
- **expo-router** — file-based navigation
- **expo-secure-store** — API token + URL in iOS Keychain / Android Keystore
- **expo-local-authentication** — Face ID / Touch ID / fingerprint unlock
- **expo-notifications** — Expo push token registration with the desktop peer
- **expo-font** — Audiowide (headings) + Offside (body)
- **expo-clipboard** — copy peer ID
- State via React Context + hooks (auth / agent / transfers), no Redux

## Project structure

```
app/                 expo-router screens
  _layout.tsx        fonts, providers, biometric gate, root stack
  setup.tsx          3-step onboarding (URL → token → biometric)
  (tabs)/            bottom tabs: chat, transfers, peers, settings
  transfer/[id].tsx  transfer detail (progress, context, audit)
components/          Badge, StatusBar, ChatMessage, ToolCallStep, TransferRow, PeerRow
contexts/            AuthContext, AgentContext, TransferContext
api/                 typed REST client + health/agent/transfers/peers endpoints
hooks/               usePollAgent, useBiometric, useNotifications
constants/           Blue Eclipse palette + font references
lib/                 formatting helpers (bytes, time, peer id)
```

## Getting started

```bash
npm install
npx expo start            # scan the QR code with Expo Go
npx expo run:ios          # native iOS build
npx expo run:android      # native Android build
npm run typecheck         # tsc --noEmit
npm test                  # jest (jest-expo)
```

## Connecting to your desktop

1. Make sure the MARS REST API is running on your desktop peer and reachable.
2. In the app, enter the desktop's REST API URL
   (`http://your-desktop-ip:40003`) — the onboarding validates reachability.
3. Enter the same API token used by the CLI / desktop app. It is stored
   only in the device's Keychain/Keystore, never in plaintext.
4. Optionally enable biometric unlock and push notifications.

## API contract

All requests go through `api/client.ts` (`apiFetch`), which injects the Bearer
token, maps network failures to typed `AppError`s, and signs the user out on a
401. Endpoints used:

| Screen / purpose       | Endpoint                                              |
| ---------------------- | ----------------------------------------------------- |
| Connection test        | `GET /api/v1/health`, `GET /api/v1/health/ready`      |
| Agent chat             | `POST /api/v1/agent/message`, `GET /api/v1/agent/messages/{id}`, `GET /api/v1/agent/status` |
| Transfers              | `GET /api/v1/transfers`, `GET /api/v1/transfers/{id}`, `GET /api/v1/transfers/{id}/status` |
| Peers                  | `GET /api/v1/sessions`                                |
| Push registration      | `POST /api/v1/agent/device-token`, `DELETE /api/v1/agent/device-token/{device_name}` |

## Notes / deviations from the Phase 14 spec

- Uses **Expo SDK 54** (the spec pinned SDK 51, which is no longer installable
  with current toolchains); the app structure, screens and flow match the spec.
- Icons use `@expo/vector-icons` (bundled) instead of `lucide-react-native` to
  avoid an extra dependency; the empty-state FileX is `file-tray-outline`.
- Integration tests mock the Phase 4 REST API at the `api/*` module layer
  (rather than `msw`) for reliability under `jest-expo`.
- `POST /api/v1/agent/device-token` is the single new backend endpoint Phase 14
  requires; it must be added to the MARS REST API
  (see `docs/ADTP_Phase14_Build_Spec.docx`).
