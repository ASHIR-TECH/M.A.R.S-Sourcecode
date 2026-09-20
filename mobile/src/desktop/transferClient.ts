import { asRecord, request, str } from './agentClient';
import { ApiError } from './errors';
import { DesktopConnection, SessionRecord, TransferRecord, WatcherRecord } from './types';

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

export { ApiError };