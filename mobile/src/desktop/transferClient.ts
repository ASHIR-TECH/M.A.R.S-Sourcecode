import { asRecord, request, str, trimBase } from './agentClient';
import { ApiError } from './errors';
import { DesktopConnection, SessionRecord, TransferRecord, WatcherRecord } from './types';

const UPLOAD_TIMEOUT_MS = 120000;

function asList(value: unknown, key: string): unknown[] {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  const nested = record[key] ?? record[key.replace('_', '')];
  return Array.isArray(nested) ? nested : [];
}

function toStatus(value: unknown): TransferRecord['status'] {
  const s = str(value);
  if (
    s === 'queued' ||
    s === 'negotiating' ||
    s === 'transferring' ||
    s === 'completed' ||
    s === 'failed' ||
    s === 'cancelled'
  ) {
    return s;
  }
  return 'completed';
}

function toProgress(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function normalizeTransfer(raw: unknown): TransferRecord | null {
  const r = asRecord(raw);
  const id = str(r.id) ?? str(r.transfer_id) ?? str(r.task_id);
  const fileName = str(r.file_name) ?? str(r.fileName) ?? str(r.filename) ?? str(r.name);
  if (!id || !fileName) return null;
  return {
    id,
    fileName,
    sizeBytes: typeof r.size_bytes === 'number' ? r.size_bytes : typeof r.size === 'number' ? r.size : undefined,
    direction: str(r.direction) === 'incoming' ? 'incoming' : 'outgoing',
    status: toStatus(r.status),
    peerId: str(r.peer_id) ?? str(r.peerId) ?? '',
    peerName: str(r.peer_name) ?? str(r.peerName),
    startedAt: str(r.started_at) ?? str(r.startedAt),
    completedAt: str(r.completed_at) ?? str(r.completedAt),
    progress: toProgress(r.progress),
  };
}

function toCount(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined;
  return Math.floor(value);
}

function normalizeSession(raw: unknown): SessionRecord | null {
  const r = asRecord(raw);
  const id = str(r.id) ?? str(r.session_id);
  const peerId = str(r.peer_id) ?? str(r.peerId) ?? str(r.peer) ?? '';
  if (!id && !peerId) return null;
  return {
    id: id ?? peerId,
    peerId,
    peerName: str(r.peer_name) ?? str(r.peerName),
    connectedAt: str(r.connected_at) ?? str(r.connectedAt) ?? new Date().toISOString(),
    lastActivityAt: str(r.last_activity_at) ?? str(r.lastActivityAt) ?? str(r.last_activity) ?? str(r.lastActivity),
    transferCount: toCount(r.transfer_count) ?? toCount(r.transferCount) ?? 0,
    bytesTransferred:
      typeof r.bytes_transferred === 'number'
        ? r.bytes_transferred
        : typeof r.bytesTransferred === 'number'
          ? r.bytesTransferred
          : typeof r.bytes === 'number'
            ? r.bytes
            : undefined,
  };
}

function normalizeWatcher(raw: unknown): WatcherRecord | null {
  const r = asRecord(raw);
  const path = str(r.path) ?? str(r.folder) ?? str(r.watch_path);
  if (!path) return null;
  return {
    path,
    peerId: str(r.peer_id) ?? str(r.peerId),
    peerName: str(r.peer_name) ?? str(r.peerName),
    active: r.active === true || r.enabled === true,
  };
}

function mapOrEmpty<T>(list: unknown[], normalize: (raw: unknown) => T | null): T[] {
  return list.map(normalize).filter((item): item is T => item !== null);
}

/** GET /api/v1/transfers — recent transfers executed by the desktop peer. */
export async function listTransfers(conn: DesktopConnection): Promise<TransferRecord[]> {
  const data = await request<unknown>(conn, '/api/v1/transfers', { method: 'GET' });
  return mapOrEmpty(asList(data, 'transfers'), normalizeTransfer);
}

/** GET /api/v1/sessions — live/visible peer connections. */
export async function listSessions(conn: DesktopConnection): Promise<SessionRecord[]> {
  const data = await request<unknown>(conn, '/api/v1/sessions', { method: 'GET' });
  return mapOrEmpty(asList(data, 'sessions'), normalizeSession);
}

/** GET /api/v1/watchers — incoming-file watch folders. */
export async function listWatchers(conn: DesktopConnection): Promise<WatcherRecord[]> {
  const data = await request<unknown>(conn, '/api/v1/watchers', { method: 'GET' });
  return mapOrEmpty(asList(data, 'watchers'), normalizeWatcher);
}

/** A file the phone is handing to the desktop, plus where it landed. */
export interface UploadedFile {
  id: string;
  filename: string;
  /** Absolute path on the desktop — pass this to the agent so it can use it. */
  path: string;
  size: number;
  sha256: string;
}

export interface OutgoingFile {
  uri: string;
  name: string;
  mimeType?: string;
}

/**
 * POST /api/v1/transfers/upload — hands the picked file's bytes to the desktop.
 *
 * This is the only direction the phone→desktop file path can move over REST:
 * `POST /transfers/send` only accepts a path already on the desktop, and the
 * QUIC data plane (:40001) has no mobile implementation. The response's
 * absolute path is what lets the desktop agent open, move or re-send the file.
 */
export async function uploadFile(conn: DesktopConnection, file: OutgoingFile): Promise<UploadedFile> {
  const form = new FormData();
  // React Native FormData takes a {uri,name,type} part; fetch sets the
  // multipart boundary itself, so no Content-Type header here.
  form.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType ?? 'application/octet-stream',
  } as unknown as Blob);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${trimBase(conn.baseUrl)}/api/v1/transfers/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${conn.token}` },
      body: form,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      controller.signal.aborted ? 'timeout' : 'network',
      controller.signal.aborted
        ? 'The upload timed out. Check the file size and that your desktop is online.'
        : 'Could not reach your desktop to upload the file.'
    );
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 || res.status === 403) {
    throw new ApiError('auth', 'Your desktop rejected the API token.', res.status);
  }
  if (!res.ok) {
    throw new ApiError('server', `The desktop rejected the upload (${res.status}).`, res.status);
  }

  const data = asRecord(await res.json().catch(() => ({})));
  const path = str(data.path);
  if (!path) {
    throw new ApiError('server', 'The desktop did not report where it saved the file.');
  }
  return {
    id: str(data.id) ?? '',
    filename: str(data.filename) ?? file.name,
    path,
    size: typeof data.size === 'number' ? data.size : 0,
    sha256: str(data.sha256) ?? '',
  };
}

export { ApiError };