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
  osVersion?: string;
  arch?: string;
  cpuPercent?: number;
  cpuCount?: number;
  ramPercent?: number;
  ramTotalBytes?: number;
  ramUsedBytes?: number;
  batteryPercent?: number;
  batteryCharging?: boolean;
  batteryPresent?: boolean;
  batterySecondsRemaining?: number;
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
  const battery = asRecord(r.battery);
  return {
    hostname: str(r.hostname),
    os: str(r.os),
    osVersion: str(r.os_version) ?? str(r.osVersion),
    arch: str(r.arch),
    cpuPercent: num(r.cpu_percent) ?? num(r.cpuPercent),
    cpuCount: num(r.cpu_count) ?? num(r.cpuCount),
    ramPercent: num(r.ram_percent) ?? num(r.ramPercent),
    ramTotalBytes: num(r.ram_total) ?? num(r.ramTotal),
    ramUsedBytes: num(r.ram_used) ?? num(r.ramUsed),
    batteryPercent: num(battery.percent) ?? num(r.battery_percent) ?? num(r.batteryPercent),
    batteryCharging:
      typeof battery.charging === 'boolean'
        ? battery.charging
        : typeof r.battery_charging === 'boolean'
          ? r.battery_charging
          : undefined,
    batteryPresent: typeof battery.present === 'boolean' ? battery.present : undefined,
    batterySecondsRemaining:
      num(battery.seconds_remaining) ?? num(r.battery_seconds_remaining),
  };
}

/** GET /api/v1/system/info — throws ApiError when unreachable/unauthorized. */
export async function fetchSystemInfo(conn: DesktopConnection): Promise<DesktopSystemInfo> {
  const data = await request<unknown>(conn, '/api/v1/system/info', { method: 'GET' }, TIMEOUT_MS);
  return normalizeSystemInfo(data);
}
