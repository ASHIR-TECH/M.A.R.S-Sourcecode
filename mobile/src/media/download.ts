import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { supabase } from '../auth/supabaseClient';
import { mediaOriginalUrl } from './urls';
import type { MediaRef } from './types';

const DOWNLOAD_DIR_KEY = 'mars.downloadDirUri';

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
 * On Android, get a user-visible folder (Downloads by default) via the Storage
 * Access Framework. The permission is remembered after the first pick.
 */
async function visibleAndroidDirectory(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;
  try {
    const saved = await SecureStore.getItemAsync(DOWNLOAD_DIR_KEY);
    if (saved) return saved;
  } catch {
    // Fall through and ask once.
  }
  try {
    const initialUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Download');
    const result = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(initialUri);
    if (!result.granted) return null;
    await SecureStore.setItemAsync(DOWNLOAD_DIR_KEY, result.directoryUri);
    return result.directoryUri;
  } catch {
    return null;
  }
}

/**
 * Download a MediaRef and make the file visible to the user.
 *
 * The stable `/api/media/file/:id` URL is a header-free redirect that mints a
 * short-lived signed Upstash Blob URL on every request — the browser page the
 * user used to see was that redirect, not the Blob bucket itself. We fetch it
 * in-app, then copy the bytes into the user's Downloads folder on Android.
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
  const localUri = `${directory}${Date.now()}-${name}`;
  const result = await FileSystem.downloadAsync(url, localUri, { headers });
  if (result.status !== 200) {
    await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {});
    throw new Error(`Download failed (${result.status})`);
  }

  const visibleDirectory = await visibleAndroidDirectory();
  if (visibleDirectory) {
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const stem = name.replace(/\.[^.]+$/, '') || 'download';
    const publicUri = await FileSystem.StorageAccessFramework.createFileAsync(
      visibleDirectory,
      stem,
      media.mimeType || 'application/octet-stream'
    );
    await FileSystem.StorageAccessFramework.writeAsStringAsync(publicUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return { uri: publicUri, name };
  }

  // iOS has no shared Downloads folder without a share sheet; keep the file in
  // the app's Documents directory where it remains available to the app.
  return { uri: result.uri, name };
}
