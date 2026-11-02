import * as FileSystem from 'expo-file-system/legacy';

import { getInstallId } from '../relay/deviceId';
import { ApiError } from './errors';
import { InboxFile } from './deviceClient';
import { DesktopConnection } from './types';
import { trimBase } from './agentClient';

const DOWNLOAD_TIMEOUT_MS = 120000;

function safeName(name: string): string {
  const cleaned = name.replace(/[/\\]/g, '_').replace(/^\.+/, '').trim();
  return cleaned || 'file.bin';
}

/**
 * GET /api/v1/devices/{deviceId}/files/{fileId} — pull a desktop-staged file
 * into the app's document directory. The gateway marks it delivered, so the
 * next inbox poll no longer returns it.
 */
export async function downloadInboxFile(
  conn: DesktopConnection,
  file: InboxFile
): Promise<string> {
  const deviceId = await getInstallId();
  const base = FileSystem.documentDirectory;
  if (!base) {
    throw new ApiError('server', 'This device has no writable documents directory.');
  }

  const directory = `${base}mars-inbox/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true }).catch(() => {});
  const target = `${directory}${Date.now()}-${safeName(file.filename)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const result = await FileSystem.downloadAsync(
      `${trimBase(conn.baseUrl)}/api/v1/devices/${encodeURIComponent(deviceId)}/files/${encodeURIComponent(file.id)}`,
      target,
      {
        headers: { Authorization: `Bearer ${conn.token}` },
        sessionType: FileSystem.FileSystemSessionType.BACKGROUND,
      }
    );
    if (result.status !== 200) {
      throw new ApiError('server', `Download failed (${result.status}).`, result.status);
    }
    return result.uri;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      controller.signal.aborted ? 'timeout' : 'network',
      controller.signal.aborted
        ? 'The download timed out.'
        : 'Could not download the file from your desktop.'
    );
  } finally {
    clearTimeout(timer);
  }
}
