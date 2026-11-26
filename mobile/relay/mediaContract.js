/**
 * Shared v2 MediaRef wire shape for the MARS relay.
 *
 * ADTP's gateway constructs the same fields (see adtp-core::media::MediaRef
 * and packages/adtp-api/src/adtp_api/models/media.py). Keeping the mapping in
 * one place means both clients see identical names, sizes, status and expiry.
 */
const DEFAULT_RETENTION_SECONDS = 24 * 60 * 60;

function finiteNumber(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function retentionExpiry(createdAt, retentionSeconds) {
  const seconds = finiteNumber(retentionSeconds, DEFAULT_RETENTION_SECONDS);
  const start = Date.parse(createdAt);
  const base = Number.isFinite(start) ? start : Date.now();
  return new Date(base + seconds * 1000).toISOString();
}

function isExpired(record, nowMs = Date.now()) {
  if (record.status === 'expired' || record.status === 'deleted') return true;
  if (!record.expiresAt) return false;
  const deadline = Date.parse(record.expiresAt);
  return Number.isFinite(deadline) && deadline <= nowMs;
}

function wireStatus(record, nowMs = Date.now()) {
  // The relay used `pending` / `complete`; the shared state machine uses
  // `created` / `ready`. Map at the boundary, never in chat payloads.
  let status = record.status;
  if (status === 'pending') status = 'created';
  if (status === 'complete' || status === 'completed') status = 'ready';
  if (status === 'ready' && isExpired(record, nowMs)) status = 'expired';
  return status;
}

function buildMediaRef(record, serviceUrl, nowMs = Date.now()) {
  const stored = finiteNumber(record.storedSize, 0) ||
    finiteNumber(record.compressedSize, finiteNumber(record.size, 0));
  const expiresAt = record.expiresAt || retentionExpiry(record.createdAt);
  return {
    schemaVersion: 2,
    id: record.id,
    serviceUrl: String(serviceUrl || '').replace(/\/$/, ''),
    name: record.name,
    mimeType: record.mimeType || 'application/octet-stream',
    size: finiteNumber(record.size, 0),
    // Both aliases stay in sync for one compatibility release.
    compressedSize: stored,
    storedSize: stored,
    ...(Number.isFinite(record.width) ? { width: record.width } : {}),
    ...(Number.isFinite(record.height) ? { height: record.height } : {}),
    ...(Number.isFinite(record.durationMs) ? { durationMs: record.durationMs } : {}),
    ...(typeof record.sha256 === 'string' ? { sha256: record.sha256 } : {}),
    ...(typeof record.sender === 'string' ? { sender: record.sender } : {}),
    ...(typeof record.recipient === 'string' ? { recipient: record.recipient } : {}),
    ...(typeof record.sessionId === 'string' ? { sessionId: record.sessionId } : {}),
    ...(typeof record.conversationId === 'string' ? { conversationId: record.conversationId } : {}),
    compressed: Boolean(record.compressed),
    hasThumbnail: Boolean(record.paths && record.paths.thumbnail),
    createdAt: record.createdAt || new Date(nowMs).toISOString(),
    expiresAt,
    status: wireStatus({ ...record, expiresAt }, nowMs),
  };
}

module.exports = {
  DEFAULT_RETENTION_SECONDS,
  retentionExpiry,
  isExpired,
  wireStatus,
  buildMediaRef,
};
