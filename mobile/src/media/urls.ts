import type { MediaRef, MediaStatus } from './types';

const MEDIA_STATUSES: MediaStatus[] = [
  'created',
  'uploading',
  'verifying',
  'ready',
  'failed',
  'cancelled',
  'deleting',
  'expired',
  'deleted',
];

/**
 * Optional host allowlist. When set (comma-separated), media service URLs from
 * chat messages may only point at these hosts. Existing deployments with no
 * allowlist configured keep accepting any http(s) service URL.
 */
function allowedMediaHosts(): string[] {
  return String(process.env.EXPO_PUBLIC_MEDIA_HOSTS || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

/** Never let a wire message smuggle a javascript:/file: URL into Linking/Image. */
function safeBaseUrl(value: unknown, enforceHosts = false): string {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    const allowed = allowedMediaHosts();
    if (enforceHosts && allowed.length > 0 && !allowed.includes(url.hostname.toLowerCase())) {
      return '';
    }
    return value.replace(/\/$/, '');
  } catch {
    // not a URL
  }
  return '';
}

function size(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

function validId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 255 &&
    !/[\\/\u0000-\u001f]/.test(value)
  );
}

function fallbackBaseUrl(): string {
  // Validate the fallback too: an invalid env value such as the literal string
  // "undefined" must never become a reachable media service URL.
  return safeBaseUrl(process.env.EXPO_PUBLIC_BACKEND_URL, true);
}

/**
 * Harden arbitrary JSON received over the desktop WebSocket into a MediaRef.
 * Returns null for anything that isn't a usable media reference, so a malformed
 * ADTP message can't crash the chat renderer.
 */
export function normalizeMediaRef(input: unknown): MediaRef | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  if (!validId(raw.id) || typeof raw.name !== 'string' || !raw.name.trim()) return null;
  const serviceUrl = safeBaseUrl(raw.serviceUrl, true) || fallbackBaseUrl();
  if (!serviceUrl) return null;

  const version =
    raw.schemaVersion === 2 || raw.schemaVersion === 2.0
      ? 2
      : 1;
  const stored = size(raw.storedSize) || size(raw.compressedSize);
  const status =
    typeof raw.status === 'string' && MEDIA_STATUSES.includes(raw.status as MediaStatus)
      ? (raw.status as MediaStatus)
      : version === 1
        ? 'ready'
        : undefined;

  return {
    schemaVersion: version,
    id: raw.id,
    serviceUrl,
    name: raw.name.trim().slice(0, 255),
    mimeType:
      typeof raw.mimeType === 'string' && raw.mimeType.length > 0 && raw.mimeType.length <= 150
        ? raw.mimeType
        : 'application/octet-stream',
    size: size(raw.size),
    compressedSize: size(raw.compressedSize),
    ...(stored > 0 ? { storedSize: stored } : {}),
    ...(typeof raw.width === 'number' && raw.width >= 0 ? { width: raw.width } : {}),
    ...(typeof raw.height === 'number' && raw.height >= 0 ? { height: raw.height } : {}),
    ...(typeof raw.durationMs === 'number' && raw.durationMs >= 0
      ? { durationMs: raw.durationMs }
      : {}),
    ...(typeof raw.sha256 === 'string' && /^[a-f0-9]{32,128}$/i.test(raw.sha256)
      ? { sha256: raw.sha256 }
      : {}),
    ...(typeof raw.sender === 'string' ? { sender: raw.sender.slice(0, 100) } : {}),
    ...(typeof raw.recipient === 'string' ? { recipient: raw.recipient.slice(0, 100) } : {}),
    ...(typeof raw.sessionId === 'string' ? { sessionId: raw.sessionId.slice(0, 120) } : {}),
    ...(typeof raw.conversationId === 'string'
      ? { conversationId: raw.conversationId.slice(0, 120) }
      : {}),
    compressed: Boolean(raw.compressed),
    hasThumbnail: Boolean(raw.hasThumbnail),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
    ...(typeof raw.expiresAt === 'string' && !Number.isNaN(Date.parse(raw.expiresAt))
      ? { expiresAt: raw.expiresAt }
      : {}),
    ...(status ? { status } : {}),
  };
}

/** True when the retention deadline has passed, or the transfer is terminal. */
export function isMediaUnavailable(
  media: MediaRef,
  nowMs: number = Date.now()
): 'expired' | 'deleted' | null {
  if (media.status === 'deleted' || media.status === 'expired') return media.status;
  if (media.expiresAt) {
    const deadline = Date.parse(media.expiresAt);
    if (Number.isFinite(deadline) && deadline <= nowMs) return 'expired';
  }
  return null;
}

function fileUrl(media: MediaRef, kind: 'original' | 'thumbnail', download: boolean): string {
  const base = safeBaseUrl(media.serviceUrl) || fallbackBaseUrl();
  const params = new URLSearchParams({ kind });
  if (download) params.set('download', '1');
  return `${base}/api/media/file/${encodeURIComponent(media.id)}?${params.toString()}`;
}

/**
 * ADTP's gateway uploads use its own loopback API URL by default, so a
 * MediaRef created on the desktop can name `127.0.0.1:40003` as its service.
 * The phone cannot reach that — rewrite it to the paired desktop base URL it
 * already uses for chat and uploads. Non-loopback URLs are left alone.
 */
export function mediaThroughDesktop(
  media: MediaRef | null | undefined,
  desktopBaseUrl?: string | null
): MediaRef | null {
  if (!media || !desktopBaseUrl) return media ?? null;
  try {
    const url = new URL(media.serviceUrl);
    const loopback =
      url.hostname === '127.0.0.1' ||
      url.hostname === 'localhost' ||
      url.hostname === '[::1]' ||
      url.hostname === '::1';
    if (!loopback) return media;
    return { ...media, serviceUrl: desktopBaseUrl.replace(/\/+$/, '') };
  } catch {
    return media;
  }
}

/** Stable URL (refreshes the 10-minute signed link on every request). */
export function mediaOriginalUrl(media: MediaRef): string {
  return fileUrl(media, 'original', false);
}

/** null when the upload had no thumbnail (video/documents). */
export function mediaThumbnailUrl(media: MediaRef): string | null {
  return media.hasThumbnail ? fileUrl(media, 'thumbnail', false) : null;
}

/** Opened via Linking / WebBrowser; prompts a save with the original filename. */
export function mediaDownloadUrl(media: MediaRef): string {
  return fileUrl(media, 'original', true);
}
