# Blob feature — MARS implementation status

Scope: **MARS only** (mobile app + MARS media relay). ADTP work is explicitly out of scope for this branch.
Spec: `docs/Blob feature.md`. Updated: 27 November 2026.

## Official public relay endpoint

`https://danceable-unrectified-missy.ngrok-free.app` is the reserved ngrok domain used by the mobile builds. It is set as:

- `EXPO_PUBLIC_BACKEND_URL` in all `mobile/eas.json` build profiles
- `RELAY_PUBLIC_URL` in `mobile/relay/.env`
- ADTP's gateway can keep `ADTP_RELAY_URL=http://127.0.0.1:3001` when it runs on the same machine; remote ADTP installs should use the public URL.

The domain is stable, but the ngrok agent must be running or the URL returns 404 (`ERR_NGROK_3200`). Start both pieces with:

```bash
cd mobile
bash scripts/start-public-relay.sh
```

Verify with `curl https://danceable-unrectified-missy.ngrok-free.app/health` — expect `{"ok":true,...,"blobMediaConfigured":true}`.

## Phase 0 — Baseline (complete)

- [x] Media bytes are stored in the private Upstash Blob bucket `Mars`; the bucket token (`UPSTASH_BLOB_TOKEN`) is only in `mobile/relay/.env`, never in the app bundle.
- [x] `ADTP_MEDIA_TOKEN` is a server-to-server secret owned by the relay (and the ADTP gateway, outside this scope).
- [x] `mobile/package.json` depends on `@upstash/blob`, not Redis.
- [x] Current relay metadata is a process-local `Map` persisted to a JSON file (`mobile/relay/media.js`). It does not survive multiple relay instances and has no expiry worker.
- [ ] **Blocked / deferred:** no `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are configured, so the Redis metadata repository and expiry sorted set from Phase 1/6 cannot be implemented or verified yet. The doc requires this as a separate Upstash resource; provide credentials before starting that work.

## Phase 1 — Contract and validation (MARS portion complete)

- [x] `media/types.ts`: `MediaRef` extended with `schemaVersion`, `storedSize`, `recipient`, `conversationId`, `expiresAt`, `status` and the `MediaStatus` state machine. `compressedSize` kept as a v1 alias; `storedSizeOf()` prefers the v2 field.
- [x] `media/urls.ts`: `normalizeMediaRef()` now upgrades v1 → v2 (implicit `ready`), validates ids (no traversal/control chars), clamps negative sizes, bounds MIME/name lengths, validates checksums and timestamps, and supports an optional host allowlist via `EXPO_PUBLIC_MEDIA_HOSTS`.
- [x] `isMediaUnavailable()` exposes `expired` / `deleted` from `expiresAt` or terminal status.
- [x] Legacy compatibility preserved: v1 wire references still normalize; no client or relay change required for existing messages.
- [ ] Shared cross-language fixtures (TypeScript/Python/Rust) require ADTP, so deferred to the ADTP work package.

## Phase 3 — MARS sender (in progress)

- [x] `compress.ts`: `fitWithinMaxEdge()` bounds the **longest edge** to 1600 px for images and 320 px for thumbnails, preserving aspect ratio for portrait images (previous width-only resize broke this).
- [x] PNG transparency is preserved by keeping PNG output; animated GIF/WebP are left byte-for-byte intact rather than being flattened to a still JPEG.
- [ ] Direct-Blob upload is already the MARS primary path; gateway upload is currently used first by the chat composer. Needs the routing correction described in the spec (gateway becomes compatibility fallback).
- [ ] Base64 whole-file buffering in `blobClient.ts` still needs a streaming/native upload task.
- [ ] Real byte-based progress, cancellation, retry and idempotency keys are still pending.

## Phase 5 — Recipient UI (partial)

- [x] `MediaCard` shows `Media expired` / `Media unavailable` and disables download for expired or deleted references; uses `storedSizeOf()`.
- [ ] Native save/share download (replacing `Linking.openURL`) still pending.
- [ ] Thumbnail 404/410 fallback to a file tile still pending.

## Verification after Phase 0/1

- `tsc --noEmit`: PASS
- Jest: **256 passed / 44 suites** (added MediaRef v2 normalization, expiry, host allowlist, and orientation-aware resize tests)

## Next MARS-only steps

1. Switch the chat composer to use `uploadMedia()` (compress → direct Blob) first, with `uploadMediaViaGateway()` as fallback, and add idempotency + cancellation.
2. Replace Base64 upload in `blobClient.ts` with a native streaming upload task and real progress.
3. Add native download/save/share for MARS, with 404/410/expired handling in `MediaCard`.
4. When Redis credentials are available, add the metadata repository, expiry index and cleanup worker to `mobile/relay/media.js` while keeping the legacy routes as adapters.
