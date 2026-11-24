/**
 * Server-side Upstash Blob client for MARS media (bucket: "Mars").
 *
 * The blob token is a bucket-wide bearer secret. It is read only here — in the
 * Node relay — and never bundled into the Expo app. Phones and the ADTP desktop
 * gateway ask the relay for short-lived signed URLs (see mobile/relay/media.js)
 * and talk to storage directly.
 *
 * The relay runs on Node 24, which strips TypeScript types from `.ts` files at
 * runtime, so this file is used as-is with no build step.
 */
import { Bucket } from '@upstash/blob';
import type { Duration, Size } from '@upstash/blob';

let shared: Bucket | undefined;

/** Build a client from an explicit token, or from process.env.UPSTASH_BLOB_TOKEN. */
export function createBucket(token?: string): Bucket {
  const resolved = token || process.env.UPSTASH_BLOB_TOKEN;
  if (!resolved) {
    throw new Error('UPSTASH_BLOB_TOKEN is not set (see relay/.env)');
  }
  // Media is private and refreshed through signed URLs; never cache it at the edge.
  return new Bucket({ token: resolved, cache: 'no-store' });
}

/** Lazily-created shared client for the process. */
export function getBucket(): Bucket {
  if (!shared) shared = createBucket();
  return shared;
}

/** Keep filenames safe as an object key while leaving the display name alone. */
export function safeFileName(name: string): string {
  const cleaned = String(name || 'file')
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  // A key segment of "." or ".." is refused by storage (path traversal guard).
  if (!cleaned || cleaned === '.' || cleaned === '..') return 'file';
  return cleaned;
}

/** Deterministic, collision-free key layout: media/YYYY/MM/<id>/<name>. */
export function mediaPaths(
  id: string,
  name: string,
  withThumbnail: boolean
): { original: string; thumbnail?: string } {
  const now = new Date();
  const prefix = `media/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${id}`;
  return {
    original: `${prefix}/${safeFileName(name)}`,
    ...(withThumbnail ? { thumbnail: `${prefix}/thumb.jpg` } : {}),
  };
}

export interface UploadGrantOptions {
  contentType: string;
  /** Exact compressed byte length; pins the signed PUT so a different body is rejected. */
  size?: Size;
  expiresIn?: Duration;
  metadata?: Record<string, string>;
}

/** Mint a one-PUT grant. The caller forwards url + headers to the device verbatim. */
export async function signUpload(
  path: string,
  options: UploadGrantOptions,
  bucket: Bucket = getBucket()
) {
  const grant = await bucket.signedUploadUrl(path, {
    contentType: options.contentType,
    ...(options.size !== undefined ? { size: options.size } : {}),
    expiresIn: options.expiresIn ?? '10m',
    ...(options.metadata ? { metadata: options.metadata } : {}),
  });
  return {
    path,
    url: grant.url,
    headers: grant.headers,
    expiresAt: grant.expiresAt.toISOString(),
  };
}

export interface ReadGrantOptions {
  expiresIn?: Duration;
  downloadAs?: string;
}

/** Mint a short-lived read grant. Private buckets have no public URL. */
export async function signRead(
  path: string,
  options: ReadGrantOptions = {},
  bucket: Bucket = getBucket()
) {
  const grant = await bucket.signedReadUrl(path, {
    expiresIn: options.expiresIn ?? '10m',
    ...(options.downloadAs ? { downloadAs: options.downloadAs } : {}),
  });
  return { url: grant.url, expiresAt: grant.expiresAt.toISOString() };
}

/** Remove both objects when a transfer is cancelled or a record is deleted. */
export async function deleteObjects(paths: string[], bucket: Bucket = getBucket()): Promise<void> {
  const kept = paths.filter(Boolean);
  if (kept.length) await bucket.del(kept);
}

/** Diagnostic only: "Mars" is private, so this returns undefined. */
export async function isPublicBucket(): Promise<boolean> {
  return Boolean(await getBucket().publicUrl('__probe__'));
}
