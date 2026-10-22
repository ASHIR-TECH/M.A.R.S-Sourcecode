import { asRecord, request, str } from './agentClient';
import { DesktopConnection } from './types';

const TIMEOUT_MS = 8000;

/**
 * Minimal host telemetry for the Home card — only what the UI actually shows.
 * Full system info is available via the Device Hub if needed.
 */
export interface DesktopSystemInfo {
  hostname?: string;
  os?: string;
  cpuPercent?: number;
  ramPercent?: number;
}

function num(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function normalizeSystemInfo(raw: unknown): DesktopSystemInfo {
  const r = asRecord(raw);
  return {
    hostname: str(r.hostname),
    os: str(r.os),
    cpuPercent: num(r.cpu_percent) ?? num(r.cpuPercent),
    ramPercent: num(r.ram_percent) ?? num(r.ramPercent),
  };
}

/** GET /api/v1/system/info — throws ApiError when unreachable/unauthorized. */
export async function fetchSystemInfo(conn: DesktopConnection): Promise<DesktopSystemInfo> {
  const data = await request<unknown>(conn, '/api/v1/system/info', { method: 'GET' }, TIMEOUT_MS);
  return normalizeSystemInfo(data);
}
