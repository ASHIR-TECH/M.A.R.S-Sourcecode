/**
 * MARS media service — Upstash Blob ("Mars" bucket) API integration.
 *
 * The bucket is private, so the phone/desktop never receives a permanent URL.
 * Instead:
 *   1. POST /api/media/sign      -> minted one-PUT grants (original + thumbnail)
 *   2. device PUTs compressed bytes straight to those grants
 *   3. POST /api/media/complete  -> records a stable MediaRef id
 *   4. chat/device messages carry only the MediaRef (JSON metadata, no bytes)
 *   5. GET /api/media/file/:id   -> 302 to a freshly signed read link, so an old
 *                                   message still works after the 10-min link dies
 *
 * Auth: Supabase JWT (phone users) or ADTP_MEDIA_TOKEN (desktop gateway).
 * Reads by id are intentionally header-free so <Image> can load thumbnails;
 * ids are random UUIDs, which makes them capability URLs. See docs/MEDIA_PIPELINE.md.
 */
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  createBucket,
  mediaPaths,
  signRead,
  signUpload,
  deleteObjects,
} = require('../../lib/blob.ts');

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
const DATA_DIR = path.resolve(__dirname, '.data');
const DATA_FILE = path.join(DATA_DIR, 'media.json');

/** Create the router with the relay's already-merged env + shared helpers. */
function createMediaRouter({ envVars, verifySupabaseSession, timingSafeEqualStr, rateLimit }) {
  const bucket = envVars.UPSTASH_BLOB_TOKEN
    ? createBucket(envVars.UPSTASH_BLOB_TOKEN)
    : null;
  const adtpToken = envVars.ADTP_MEDIA_TOKEN || '';
  const serviceUrl = (envVars.RELAY_PUBLIC_URL || '').replace(/\/$/, '');

  const records = new Map();
  try {
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (Array.isArray(parsed)) {
        for (const record of parsed) {
          if (record && typeof record.id === 'string') records.set(record.id, record);
        }
      }
    }
  } catch (err) {
    console.error('[media] could not load media index:', err && err.message ? err.message : err);
  }

  function persist() {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(Array.from(records.values())), 'utf8');
    } catch (err) {
      console.error('[media] could not persist media index:', err && err.message ? err.message : err);
    }
  }

  function baseUrl(req) {
    if (serviceUrl) return serviceUrl;
    const forwarded = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
    const protocol = forwarded || req.protocol || 'http';
    return `${protocol}://${req.get('host')}`;
  }

  /** Returns { kind, id } or null. The id is used only as an owner tag. */
  async function authorize(req) {
    const header = req.headers.authorization;
    const token = typeof header === 'string' ? header.replace(/^Bearer\s+/i, '').trim() : '';
    if (!token) return null;

    if (adtpToken && timingSafeEqualStr(token, adtpToken)) {
      return { kind: 'adtp', id: 'adtp-gateway' };
    }
    if (await verifySupabaseSession(req)) {
      return { kind: 'user', id: crypto.createHash('sha256').update(token).digest('hex').slice(0, 32) };
    }
    return null;
  }

  function mediaRef(record, req) {
    return {
      id: record.id,
      serviceUrl: baseUrl(req),
      name: record.name,
      mimeType: record.mimeType,
      size: record.size,
      compressedSize: record.compressedSize,
      width: record.width,
      height: record.height,
      durationMs: record.durationMs,
      sha256: record.sha256,
      sender: record.sender,
      sessionId: record.sessionId,
      compressed: Boolean(record.compressed),
      hasThumbnail: Boolean(record.paths && record.paths.thumbnail),
      createdAt: record.createdAt,
    };
  }

  function validNumber(value, fallback) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  }

  const router = express.Router();

  /** POST /api/media/sign — mint direct-to-storage PUT grants. */
  router.post('/sign', rateLimit({ windowMs: 60_000, max: 60 }), async (req, res) => {
    if (!bucket) {
      return res.status(500).json({ error: 'Blob storage is not configured (UPSTASH_BLOB_TOKEN)' });
    }
    const caller = await authorize(req);
    if (!caller) return res.status(401).json({ error: 'Unauthorized' });

    const body = req.body || {};
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 255) : '';
    const mimeType = typeof body.mimeType === 'string' && body.mimeType ? body.mimeType.slice(0, 150) : 'application/octet-stream';
    const originalSize = validNumber(body.size, 0);
    const compressedSize = validNumber(body.compressedSize, originalSize);
    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (compressedSize <= 0 || compressedSize > MAX_UPLOAD_BYTES) {
      return res.status(400).json({ error: 'File is empty or too large' });
    }

    const id = crypto.randomUUID();
    // Only images get a generated thumbnail (the device creates it before upload).
    const withThumbnail = Boolean(body.thumbnail) && mimeType.startsWith('image/');
    const paths = mediaPaths(id, name, withThumbnail);
    const owner = caller.id.slice(0, 64);

    try {
      const original = await signUpload(
        paths.original,
        {
          contentType: mimeType,
          size: compressedSize,
          metadata: { owner, mediaid: id },
        },
        bucket
      );
      let thumbnail = null;
      if (withThumbnail && paths.thumbnail) {
        thumbnail = await signUpload(
          paths.thumbnail,
          {
            contentType: 'image/jpeg',
            metadata: { owner, mediaid: id },
          },
          bucket
        );
      }

      const record = {
        id,
        owner,
        paths,
        name,
        mimeType,
        size: originalSize,
        compressedSize,
        width: validNumber(body.width, 0) || undefined,
        height: validNumber(body.height, 0) || undefined,
        durationMs: validNumber(body.durationMs, 0) || undefined,
        sha256: typeof body.sha256 === 'string' ? body.sha256.slice(0, 128) : undefined,
        sender: typeof body.sender === 'string' ? body.sender.slice(0, 64) : caller.kind,
        sessionId: typeof body.sessionId === 'string' ? body.sessionId.slice(0, 120) : undefined,
        compressed: Boolean(body.compressed),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      records.set(id, record);
      persist();

      return res.json({
        id,
        serviceUrl: baseUrl(req),
        expiresAt: original.expiresAt,
        original,
        thumbnail,
      });
    } catch (err) {
      console.error('[media] sign failed:', err && err.message ? err.message : err);
      return res.status(502).json({ error: 'Could not prepare upload' });
    }
  });

  /**
   * POST /api/media/ingest — server-side proxy for senders that can't do a
   * signed PUT (e.g. an ADTP job running behind a restrictive egress proxy).
   * Bytes arrive as base64 JSON, are decoded here and written with bucket.put;
   * the caller still only receives a MediaRef. Bounded by the relay's 64kb JSON
   * limit (~48 KB of decoded bytes); use /sign for anything larger.
   */
  router.post('/ingest', rateLimit({ windowMs: 60_000, max: 60 }), async (req, res) => {
    if (!bucket) {
      return res.status(500).json({ error: 'Blob storage is not configured (UPSTASH_BLOB_TOKEN)' });
    }
    const caller = await authorize(req);
    if (!caller) return res.status(401).json({ error: 'Unauthorized' });

    const body = req.body || {};
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 255) : '';
    const mimeType = typeof body.mimeType === 'string' && body.mimeType ? body.mimeType.slice(0, 150) : 'application/octet-stream';
    const data = typeof body.base64 === 'string' ? Buffer.from(body.base64, 'base64') : Buffer.alloc(0);
    const thumbData = typeof body.thumbnailBase64 === 'string' ? Buffer.from(body.thumbnailBase64, 'base64') : null;
    if (!name || !data.length) return res.status(400).json({ error: 'Missing name or base64 data' });
    if (data.length > MAX_UPLOAD_BYTES) return res.status(400).json({ error: 'File is too large' });

    const id = crypto.randomUUID();
    const withThumbnail = Boolean(thumbData && thumbData.length && mimeType.startsWith('image/'));
    const paths = mediaPaths(id, name, withThumbnail);

    try {
      await bucket.put(paths.original, data, {
        contentType: mimeType,
        metadata: { owner: caller.id.slice(0, 64), mediaid: id },
      });
      if (withThumbnail && paths.thumbnail) {
        await bucket.put(paths.thumbnail, thumbData, {
          contentType: 'image/jpeg',
          metadata: { owner: caller.id.slice(0, 64), mediaid: id },
        });
      }

      const record = {
        id,
        owner: caller.id.slice(0, 64),
        paths,
        name,
        mimeType,
        size: validNumber(body.size, data.length),
        compressedSize: data.length,
        width: validNumber(body.width, 0) || undefined,
        height: validNumber(body.height, 0) || undefined,
        sender: typeof body.sender === 'string' ? body.sender.slice(0, 64) : caller.kind,
        sessionId: typeof body.sessionId === 'string' ? body.sessionId.slice(0, 120) : undefined,
        compressed: Boolean(body.compressed),
        status: 'complete',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
      records.set(id, record);
      persist();
      return res.json({ media: mediaRef(record, req) });
    } catch (err) {
      console.error('[media] ingest failed:', err && err.message ? err.message : err);
      return res.status(502).json({ error: 'Could not store media' });
    }
  });

  /** POST /api/media/complete — finalize a MediaRef after the PUTs land. */
  router.post('/complete', rateLimit({ windowMs: 60_000, max: 120 }), async (req, res) => {
    const caller = await authorize(req);
    if (!caller) return res.status(401).json({ error: 'Unauthorized' });

    const body = req.body || {};
    const record = records.get(String(body.id || ''));
    if (!record) return res.status(404).json({ error: 'Unknown media id' });
    if (record.owner !== caller.id) return res.status(403).json({ error: 'Forbidden' });

    record.compressedSize = validNumber(body.compressedSize, record.compressedSize);
    record.width = validNumber(body.width, record.width) || record.width;
    record.height = validNumber(body.height, record.height) || record.height;
    record.durationMs = validNumber(body.durationMs, record.durationMs) || record.durationMs;
    if (typeof body.sha256 === 'string') record.sha256 = body.sha256.slice(0, 128);
    if (typeof body.thumbnailUploaded === 'boolean' && !body.thumbnailUploaded) {
      delete record.paths.thumbnail;
    }
    record.status = 'complete';
    record.completedAt = new Date().toISOString();
    persist();

    return res.json({ media: mediaRef(record, req) });
  });

  /**
   * GET /api/media/file/:id?kind=original|thumbnail&download=1
   * Header-free redirect so an <Image> can render a thumbnail. Links expire in
   * 10 minutes; this endpoint mints a fresh one every time it is called.
   */
  router.get('/file/:id', async (req, res) => {
    const record = records.get(String(req.params.id || ''));
    if (!record || record.status !== 'complete') {
      return res.status(404).json({ error: 'Media not found' });
    }
    const kind = req.query.kind === 'thumbnail' ? 'thumbnail' : 'original';
    const objectPath = kind === 'thumbnail' ? record.paths.thumbnail : record.paths.original;
    if (!objectPath) return res.status(404).json({ error: 'No thumbnail for this media' });

    try {
      const read = await signRead(
        objectPath,
        { downloadAs: req.query.download === '1' ? record.name : undefined },
        bucket
      );
      res.setHeader('Cache-Control', 'no-store');
      return res.redirect(302, read.url);
    } catch (err) {
      console.error('[media] read failed:', err && err.message ? err.message : err);
      return res.status(502).json({ error: 'Could not read media' });
    }
  });

  /** GET /api/media/:id — rehydrate a MediaRef from an old message. */
  router.get('/:id', async (req, res) => {
    const caller = await authorize(req);
    if (!caller) return res.status(401).json({ error: 'Unauthorized' });
    const record = records.get(String(req.params.id || ''));
    if (!record) return res.status(404).json({ error: 'Media not found' });
    return res.json({ media: mediaRef(record, req) });
  });

  /** DELETE /api/media/:id — remove objects + index entry. Owner only. */
  router.delete('/:id', async (req, res) => {
    const caller = await authorize(req);
    if (!caller) return res.status(401).json({ error: 'Unauthorized' });
    const record = records.get(String(req.params.id || ''));
    if (!record) return res.status(404).json({ error: 'Media not found' });
    if (record.owner !== caller.id) return res.status(403).json({ error: 'Forbidden' });

    try {
      await deleteObjects([record.paths.original, record.paths.thumbnail].filter(Boolean), bucket);
    } catch (err) {
      console.error('[media] delete failed:', err && err.message ? err.message : err);
      // A partially deleted object shouldn't leave a dangling chat link.
    }
    records.delete(record.id);
    persist();
    return res.json({ ok: true });
  });

  return router;
}

module.exports = { createMediaRouter };
