# MARS / ADTP media pipeline (Upstash Blob)

Bucket: **`Mars`** (private). Token: `UPSTASH_BLOB_TOKEN`, held only by the Node relay
(`mobile/relay/.env`) and never bundled into the Expo app or committed.

Compressed media is uploaded **directly** from the sending device to the bucket with a
short-lived signed PUT. The receiver gets only a small JSON `MediaRef`; bytes and the
bucket token never travel through chat. Because the bucket is private, reads also go
through short-lived signed URLs, which the relay re-mints on every request so old
messages keep working.

```
 MARS phone / ADTP desktop
   ├─ pick media
   ├─ compress (images: re-encode ≤1600px + JPEG q0.72; thumbnail ≤320px)
   ├─ POST /api/media/sign          (Supabase JWT or ADTP_MEDIA_TOKEN)
   ├─ PUT compressed bytes  ─────────────────────────────►  Upstash Blob "Mars"
   ├─ PUT thumbnail bytes   ─────────────────────────────►  Upstash Blob "Mars"
   └─ POST /api/media/complete  ──► MediaRef (id + metadata only)
          │
          └─ chat_message / chat_response / device_message  (wire JSON)
                    │
              receiving device
                    ├─ <Image uri=/api/media/file/{id}?kind=thumbnail>
                    └─ Download → /api/media/file/{id}&download=1 → 302 → signed GET
```

## Files

| File | Role |
|---|---|
| `lib/blob.ts` | Server-side `@upstash/blob` client (`createBucket`, `signUpload`, `signRead`, `deleteObjects`). |
| `mobile/relay/media.js` | Express router implementing the media API + on-disk index (`mobile/relay/.data/media.json`). |
| `mobile/relay/server.js` | Mounts the router at `/api/media`. |
| `mobile/src/media/compress.ts` | On-device image compression + thumbnail generation (`expo-image-manipulator`). |
| `mobile/src/media/blobClient.ts` | sign → PUT → complete pipeline used by the phone. |
| `mobile/src/media/urls.ts` | Turns a `MediaRef` into stable thumbnail/original/download URLs; hardens wire data. |
| `mobile/src/components/MediaCard.tsx` | Recipient UI: thumbnail + explicit download button. |

## Environment

```dotenv
# server only — mobile/relay/.env
UPSTASH_BLOB_TOKEN=<bucket token>
UPSTASH_BLOB_BUCKET_NAME=Mars
ADTP_MEDIA_TOKEN=<long random shared secret>   # same value on the ADTP gateway
RELAY_PUBLIC_URL=https://...                    # stable base baked into MediaRef.serviceUrl

# app only — mobile/.env
EXPO_PUBLIC_BACKEND_URL=https://...             # must point at the relay
```

## API

### `POST /api/media/sign`

Auth: `Authorization: Bearer <Supabase JWT>` **or** `Bearer <ADTP_MEDIA_TOKEN>`.

```json
{
  "name": "photo.jpg",
  "mimeType": "image/jpeg",
  "size": 8400000,
  "compressedSize": 410000,
  "width": 1600,
  "height": 1200,
  "compressed": true,
  "thumbnail": true,
  "sender": "mars-user",
  "sessionId": "default-session"
}
```

Response:

```json
{
  "id": "uuid",
  "serviceUrl": "https://relay.example",
  "expiresAt": "2026-11-20T13:22:01.000Z",
  "original": { "path": "media/2026/11/<uuid>/photo.jpg", "url": "https://…", "headers": { "content-type": "image/jpeg", "content-length": "410000" } },
  "thumbnail": { "path": "media/2026/11/<uuid>/thumb.jpg", "url": "https://…", "headers": { "content-type": "image/jpeg" } }
}
```

Signed PUT headers are part of the signature — forward them verbatim, do not add or
change headers. `content-length` is pinned to `compressedSize`, so the uploaded body
must be exactly that many bytes. Grants expire in 10 minutes.

### `POST /api/media/complete`

Auth: same caller as `/sign` (ownership is enforced). Body:
`{ "id": "uuid", "compressedSize": 410000, "width": 1600, "height": 1200, "thumbnailUploaded": true }`.
Response: `{ "media": <MediaRef> }`.

### `POST /api/media/ingest` (optional proxy path)

For senders that cannot perform a signed PUT (restrictive egress, simple job
scripts). Auth is the same. Body:
`{ name, mimeType, base64, thumbnailBase64?, size?, width?, height?, compressed?, sender? }`.
The relay decodes and writes with `bucket.put`, then returns `{ media }`. The
relay's JSON body limit makes this suitable only for small files (~48 KB of
decoded bytes); use `/sign` for real media.

### `GET /api/media/file/:id?kind=original|thumbnail&download=1`

No headers required (the UUID is the capability). `302` redirects to a freshly signed
read link valid for 10 minutes. `download=1` adds `Content-Disposition: attachment;
filename="<original name>"`. Use this URL for `<Image>` (thumbnail) and for the
download button; never cache it.

### `GET /api/media/:id` / `DELETE /api/media/:id`

Authenticated metadata lookup / owner-only delete (also removes the objects).

## MediaRef (the only thing sent in chat)

```ts
interface MediaRef {
  id: string; serviceUrl: string; name: string; mimeType: string;
  size: number; compressedSize: number; width?: number; height?: number;
  durationMs?: number; sha256?: string; sender?: string; sessionId?: string;
  compressed: boolean; hasThumbnail: boolean; createdAt: string;
}
```

Embed it in any wire message; MARS renders it identically regardless of origin:

```json
{
  "type": "chat_response",
  "sessionId": "default-session",
  "text": "Here is the render.",
  "timestamp": "2026-11-20T13:30:00.000Z",
  "media": { "id": "uuid", "serviceUrl": "https://relay.example", "name": "render.png", "mimeType": "image/png", "size": 8000000, "compressedSize": 620000, "compressed": true, "hasThumbnail": true, "createdAt": "…" }
}
```

The same `media` field is accepted on `chat_message` (phone → desktop), on
`toolCalls[].result` JSON (ADTP agent output), and on `device_message.message`
(REST push). `normalizeMediaRef()` rejects malformed/hostile values.

## ADTP desktop integration checklist

1. Set `ADTP_MEDIA_TOKEN` to the same value as the relay.
2. Compress the media before upload. For images, target ≤1600 px and generate a
   ≤320 px JPEG thumbnail. For video/audio/documents, keep the original and set
   `thumbnail: false` (or supply a generated thumbnail yourself).
3. Call `POST /api/media/sign` with the bearer token, PUT both bodies to the returned
   URLs with the exact headers, then call `/api/media/complete`.
4. Put the returned `media` object on the outbound message (`chat_response`,
   `device_message`, or a completed tool-result JSON blob). Do **not** send bytes or
   blob paths over the WebSocket — only the `MediaRef`.

Reference implementation (server-to-server, TypeScript):

```ts
const auth = { Authorization: `Bearer ${process.env.ADTP_MEDIA_TOKEN!}` };

const grant = await fetch(`${RELAY}/api/media/sign`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...auth },
  body: JSON.stringify({
    name, mimeType, size: originalSize, compressedSize: compressed.length,
    width, height, compressed: true, thumbnail: Boolean(thumb), sender: 'adtp-ai',
  }),
}).then((r) => r.json());

for (const [bytes, upload] of [[compressed, grant.original], [thumb, grant.thumbnail]]) {
  if (!upload) continue;
  const res = await fetch(upload.url, { method: 'PUT', headers: upload.headers, body: bytes });
  if (!res.ok) throw new Error(`blob upload failed: ${res.status}`);
}

const { media } = await fetch(`${RELAY}/api/media/complete`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...auth },
  body: JSON.stringify({ id: grant.id, compressedSize: compressed.length, thumbnailUploaded: Boolean(thumb) }),
}).then((r) => r.json());

// attach `media` to the chat_response / device_message payload
```

## Notes / limits

- Max compressed object: 200 MiB (configurable in `mobile/relay/media.js`).
- Images only get auto-thumbnails on the phone; video thumbnails need a native frame
  extractor on the sender side (not currently vendored). Until then the recipient sees
  a 🎬 placeholder plus the download link.
- The media index is a local JSON file, not a database. It is safe to delete: the
  objects remain in the bucket, and a fresh `/complete` re-registers them.
- Signed links expire in 10 minutes by design. Always use the stable
  `/api/media/file/:id` URL in persisted messages.
