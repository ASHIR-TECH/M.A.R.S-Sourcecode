import { Platform } from 'react-native';
import type { DesktopConnection } from '../desktop/types';
import { normalizeMediaRef } from './urls';
import type { MediaRef, MediaSource } from './types';

const UPLOAD_TIMEOUT_MS = 120_000;

function baseUrl(conn: DesktopConnection): string {
  return conn.baseUrl.replace(/\/+$/, '');
}

/**
 * Upload media through the paired desktop's gateway.
 *
 * This is the primary path: the phone already has a working route to the
 * desktop (it is chatting over it), while the relay may be unreachable from
 * the phone's network. The gateway compresses, stores the bytes in the shared
 * Upstash Blob bucket, and returns the same MediaRef the relay would mint.
 */
export async function uploadMediaViaGateway(
  conn: DesktopConnection,
  source: MediaSource,
  meta: { sender?: string; sessionId?: string } = {}
): Promise<MediaRef> {
  const form = new FormData();

  if (Platform.OS === 'web') {
    const blob = await (await fetch(source.uri)).blob();
    form.append('file', blob, source.name);
  } else {
    // React Native streams the file at `uri` instead of loading it in JS.
    form.append('file', {
      uri: source.uri,
      name: source.name,
      type: source.mimeType || 'application/octet-stream',
    } as unknown as Blob);
  }
  if (meta.sender) form.append('sender', meta.sender);
  if (meta.sessionId) form.append('sessionId', meta.sessionId);
  form.append('generateThumbnail', 'true');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${baseUrl(conn)}/api/v1/media/upload`, {
      method: 'POST',
      // Never set Content-Type: fetch adds the multipart boundary itself.
      headers: { Authorization: `Bearer ${conn.token}` },
      body: form,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    const reason = detail ? `: ${detail.slice(0, 140)}` : '';
    throw new Error(`Desktop media upload failed (${response.status})${reason}`);
  }

  const media = normalizeMediaRef(await response.json());
  if (!media) throw new Error('Desktop returned an invalid media reference');
  return media;
}
