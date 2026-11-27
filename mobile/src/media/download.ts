import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { supabase } from '../auth/supabaseClient';
import { mediaOriginalUrl } from './urls';
import type { MediaRef } from './types';

/** Filenames are display-only: never let them escape the download directory. */
export function safeFilename(value: string): string {
  const cleaned = value
    .replace(/[\\/:\u0000-\u001f]/g, '_')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 120);
  return cleaned || 'download.bin';
}

async function authHeaders(): Promise<Record<string, string>> {
  try {
    const session = await supabase?.auth.getSession();
    const token = session?.data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/**
 * Download a MediaRef into the app (or a browser download on web).
 *
 * The stable `/api/media/file/:id` URL is a header-free redirect that mints a
 * short-lived signed Upstash Blob URL on every request — the browser the user
 * saw was that redirect, not the Blob bucket itself. Fetching it here keeps the
 * user inside the app and lets us verify the response before saving.
 */
export async function downloadMedia(
  media: MediaRef
): Promise<{ uri: string; name: string }> {
  const name = safeFilename(media.name);
  const url = mediaOriginalUrl(media);
  const headers = await authHeaders();

  if (Platform.OS === 'web') {
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`Download failed (${response.status})`);
    const blob = await response.blob();
    const uri = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = uri;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return { uri, name };
  }

  const directory = `${FileSystem.documentDirectory}mars-inbox/`;
  const info = await FileSystem.getInfoAsync(directory);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  }
  const uri = `${directory}${Date.now()}-${name}`;
  const result = await FileSystem.downloadAsync(url, uri, { headers });
  if (result.status !== 200) {
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
    throw new Error(`Download failed (${result.status})`);
  }
  return { uri: result.uri, name };
}
