/** Human-readable byte size. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 'B';
  for (const u of units) {
    value /= 1024;
    unit = u;
    if (value < 1024) break;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${unit}`;
}

/** Short relative time, e.g. "2m ago", "3h ago", "5d ago". */
export function timeAgo(iso: string | number | Date): string {
  const ts = typeof iso === 'string' || typeof iso === 'number' ? new Date(iso) : iso;
  const diffMs = Date.now() - ts.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'just now';
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Local timestamp for transfer rows and detail headers. */
export function formatTimestamp(iso: string): string {
  const ts = new Date(iso);
  if (isNaN(ts.getTime())) return iso;
  return ts.toLocaleString();
}

/** Duration since an ISO timestamp, e.g. "4m 12s". */
export function connectedSince(iso: string): string {
  const ts = new Date(iso);
  if (isNaN(ts.getTime())) return '';
  const totalSec = Math.max(0, Math.floor((Date.now() - ts.getTime()) / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Path type -> friendly label. */
export function pathLabel(pathType?: string): string {
  switch (pathType) {
    case 'direct_ipv4':
      return 'Direct';
    case 'direct_ipv6':
      return 'Direct';
    case 'lan':
      return 'LAN';
    case 'hole_punch':
      return 'Punched';
    case 'relay':
      return 'Relay';
    case 'qowt':
      return 'QoWT';
    default:
      return '—';
  }
}

/** Shorten a peer id for display: 16 hex bytes -> 8-char prefix + ellipsis. */
export function shortPeerId(peerId?: string): string {
  if (!peerId) return '—';
  if (peerId.length <= 10) return peerId;
  return `${peerId.slice(0, 8)}…`;
}
