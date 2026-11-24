import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../auth/supabaseClient';
import { base64ToBytes } from './base64';
import { compressMedia } from './compress';
import { normalizeMediaRef } from './urls';
import type { CompressedMedia, MediaRef, MediaSignResponse, MediaSource } from './types';

function backendUrl(): string {
  return String(process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');
}

async function accessToken(): Promise<string | undefined> {
  const session = await supabase?.auth.getSession();
  return session?.data?.session?.access_token;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await accessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** PUT exact bytes to an Upstash signed upload grant. Headers are part of the signature. */
async function putToGrant(
  grant: { url: string; headers: Record<string, string> },
  fileUri: string
): Promise<void> {
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = base64ToBytes(base64);
  const response = await fetch(grant.url, {
    method: 'PUT',
    headers: grant.headers,
    body: bytes.buffer as ArrayBuffer,
  });
  if (!response.ok) {
    throw new Error(`Blob upload failed (${response.status})`);
  }
}

/**
 * Full pipeline: compress -> thumbnail -> sign -> direct PUT -> finalize.
 * Returns only a MediaRef; no bytes or bucket token ever reach the app bundle.
 */
export async function uploadMedia(
  source: MediaSource,
  meta: { sender?: string; sessionId?: string } = {}
): Promise<MediaRef> {
  const base = backendUrl();
  if (!base) throw new Error('Media backend is not configured');

  const compressed: CompressedMedia = await compressMedia(source);
  const response = await fetch(`${base}/api/media/sign`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      name: compressed.name,
      mimeType: compressed.mimeType,
      size: compressed.originalSize,
      compressedSize: compressed.size,
      width: compressed.width,
      height: compressed.height,
      compressed: compressed.compressed,
      thumbnail: Boolean(compressed.thumbnailUri),
      sender: meta.sender,
      sessionId: meta.sessionId,
    }),
  });

  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(detail?.error || `Could not prepare media upload (${response.status})`);
  }

  const grant = (await response.json()) as MediaSignResponse;
  await putToGrant(grant.original, compressed.uri);
  if (grant.thumbnail && compressed.thumbnailUri) {
    await putToGrant(grant.thumbnail, compressed.thumbnailUri);
  }

  const complete = await fetch(`${base}/api/media/complete`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      id: grant.id,
      compressedSize: compressed.size,
      width: compressed.width,
      height: compressed.height,
      thumbnailUploaded: Boolean(grant.thumbnail && compressed.thumbnailUri),
    }),
  });

  if (!complete.ok) {
    throw new Error(`Could not finalize media upload (${complete.status})`);
  }
  const data = (await complete.json()) as { media?: unknown };
  const media = normalizeMediaRef(data.media);
  if (!media) throw new Error('Media service returned an invalid reference');
  return media;
}
