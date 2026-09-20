# Self-hosted OTA updates server (xprem)

Serve over-the-air update to MARS from your own infrastructure — **no per-user cost, no EAS Update monthly request caps**, so mass fix pushes are free.

It's the [official Expo Updates protocol](https://docs.expo.dev/technical-specs/expo-updates-1/), so the app keeps using `expo-updates` unchanged. Runs on one small VPS; xprem is field-tested at 1M+ monthly active users on a single vCPU.

> Why not Expo's own `expo-updates-server` image? It was discontinued. `xprem` (formerly Expo Open OTA) is the maintained production-grade successor. One GitHub: `mercuretechnologies/xprem`.

## Layout

| File | Purpose |
| --- | --- |
| `docker-compose.yml` | xprem server (stateless mode) + Caddy (automatic HTTPS) |
| `Caddyfile` | TLS reverse proxy: `https://$DOMAIN` → `xprem:3000` |
| `.env.example` | all server env vars (copy to `.env`) |
| `certs/` | ring private/public key (generated, **never commit the private key**) |
| `updates/` | update bundles + assets (host storage) |
| `publish.sh` | publish current `mobile/` code as an OTA update |

## One-time server setup

1. **Generate signing keys** (do this in `mobile/`):
   ```bash
   npx eoas generate-certs   # writes certs/{private-key.pem,public-key.pem,certificate.pem}
   mkdir -p ../infra/updates-server/certs
   cp certs/private-key.pem certs/public-key.pem ../infra/updates-server/certs/
   chmod 600 ../infra/updates-server/certs/private-key.pem
   ```
2. **Create `.env`** from `.env.example`:
   - `DOMAIN` / `BASE_URL` — your public HTTPS domain (e.g. `updates.yourdomain.com`). Use `127.0.0.1.sslip.io` for local tests.
   - `JWT_SECRET` — generate once: `openssl rand -base64 32`
   - `EXPO_ACCESS_TOKEN` — from https://expo.dev/settings/access-tokens
   - `EXPO_APP_ID` — your EAS project ID (already filled: `de93ee69-8f27-4c55-a8d1-ab851751cfbb`)
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — dashboard login (8+ chars, upper+lower+digit+special)
3. **Fix volume ownership** (image runs as uid 100/gid 101):
   ```bash
   chown 100:101 ./updates
   ```
4. **Start:**
   ```bash
   docker compose up -d
   docker compose logs -f xprem   # look for "[STATELESS] Initializing Stateless Mode"
   curl https://updates.yourdomain.com/hc
   open https://updates.yourdomain.com/dashboard   # log in with ADMIN_EMAIL/ADMIN_PASSWORD
   ```

## Point the MARS app at this server

The app currently points at EAS Update (`https://u.expo.dev/…`). Switching targets the build:

```bash
npx eoas init
# answers:
#   Project id ................. de93ee69-8f27-4c55-a8d1-ab851751cfbb
#   URL of your update server .. https://updates.yourdomain.com
#   Already generated certs? ... Yes
#   Certificate path .......... ./certs/certificate.pem
```

`eoas init` rewrites `updates.url`, `updates.codeSigningCertificate` and the `expo-channel-name`/`expo-app-id` headers into your Expo config.

> This project uses `app.json`. If `eoas init` asks for `app.config.(js|ts)`, convert to a thin `app.config.js` (or paste the equivalent keys into `app.json`):
> ```json
> "updates": {
>   "url": "https://updates.yourdomain.com",
>   "enabled": true,
>   "codeSigningCertificate": "./certs/certificate.pem"
> },
> "runtimeVersion": { "policy": "fingerprint" }
> ```

**Then build a fresh Android APK** (`npm run build:android`). Server URL, signing cert and headers are embedded at build time — old builds keep hitting the old server.

## Publish a fix (mass OTA push)

```bash
EXPO_TOKEN=your-token ./publish.sh production production
# or fully manual, from mobile/:
#   export RELEASE_CHANNEL=production
#   npx eoas publish --branch production
```

The **branch must match the channel** your build was compiled with (`expo-channel-name` header). Create the channel once — dashboard "Over-the-air updates → Channels" or:
```bash
npx eas channel:create production
```

Users get the fix **silently on their next app launch** — reuse `checkForUpdatesOnLaunch()` in `mobile/src/update/ota.ts`; it works against any `updates.url` with no UI.

## Roll back / roll out

- **Rollback:** `npx eoas publish --rollback --branch production` (or the dashboard)
- **Progressive rollout:** serve an update to X% of the fleet first — dashboard → branch → rollout

## Operations notes

- **Scaling:** stateless mode = local storage; run replicas at your own risk. For multi-node, move `STORAGE_MODE` to S3/R2 and add a Redis line (see xprem docs: storage/s3-storage, caching/redis).
- **Keys in prod:** prefer `KEYS_STORAGE_TYPE=environment` (base64 in `.env`) or `aws-secrets-manager` over the local file mount.
- **Later:** the control plane (Postgres-backed, multi-app, no Expo account needed) is a drop-in upgrade — set `DB_URL` + `DB_KEYS_MASTER_KEY_B64` and the server migrates everything automatically.
- Keep `JWT_SECRET` stable between restarts or dashboard/CLI sessions invalidate.

## Docs

- xprem docs: https://mercure-technologies.gitbook.io/xprem
- eoas CLI: https://mercure-technologies.gitbook.io/xprem/eoas/overview.md