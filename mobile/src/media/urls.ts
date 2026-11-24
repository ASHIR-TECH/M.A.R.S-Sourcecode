import type { MediaRef } from './types';

/** Never let a wire message smuggle a javascript:/file: URL into Linking/Image. */
function safeBaseUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return value.replace(/\/$/, '');
    }
  } catch {
    // not a URL
  }
  return '';
}

function fallbackBaseUrl(): string {
  return String(process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');
}

/**
 * Harden arbitrary JSON received over the desktop WebSocket into a MediaRef.
 * Returns null for anything that isn't a usable media reference, so a malformed
 * ADTP message can't crash the chat renderer.
 */
export function normalizeMediaRef(input: unknown): MediaRef | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  if (typeof raw.id !== 'string' || !raw.id || typeof raw.name !== 'string') return null;
  const serviceUrl = safeBaseUrl(raw.serviceUrl) || fallbackBaseUrl();
  if (!serviceUrl) return null;

  return {
    id: raw.id,
    serviceUrl,
    name: raw.name.slice(0, 255),
    mimeType: typeof raw.mimeType === 'string' ? raw.mimeType : 'application/octet-stream',
    size: typeof raw.size === 'number' && Number.isFinite(raw.size) ? raw.size : 0,
    compressedSize:
      typeof raw.compressedSize === 'number' && Number.isFinite(raw.compressedSize)
        ? raw.compressedSize
        : 0,
    ...(typeof raw.width === 'number' ? { width: raw.width } : {}),
    ...(typeof raw.height === 'number' ? { height: raw.height } : {}),
    ...(typeof raw.durationMs === 'number' ? { durationMs: raw.durationMs } : {}),
    ...(typeof raw.sha256 === 'string' ? { sha256: raw.sha256 } : {}),
    ...(typeof raw.sender === 'string' ? { sender: raw.sender } : {}),
    ...(typeof raw.sessionId === 'string' ? { sessionId: raw.sessionId } : {}),
    compressed: Boolean(raw.compressed),
    hasThumbnail: Boolean(raw.hasThumbnail),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
  };
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
