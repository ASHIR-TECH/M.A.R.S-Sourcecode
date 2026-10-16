import { asRecord, request, str } from './agentClient';
import { DesktopConnection } from './types';

const TIMEOUT_MS = 8000;

/**
 * Normalized host telemetry from the desktop gateway (`GET /api/v1/system/info`).
 * Every metric is optional: the gateway omits what the host can't provide, and
 * the UI falls back to the pairing-time identity rather than showing zeros.
 */
export interface DesktopSystemInfo {
  hostname?: string;
  os?: string;
  osVersion?: string;
  arch?: string;
  cpuCount?: number;
  cpuPercent?: number;
  ramTotal?: number;
  ramUsed?: number;
  ramPercent?: number;
  diskTotal?: number;
  diskUsed?: number;
  diskPercent?: number;
  uptimeSeconds?: number;
  primaryIp?: string;
  gatewayVersion?: string;
  intakeDir?: string;
  agentActive?: boolean;
  agentProvider?: string;
  agentModel?: string;
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
  const agent = asRecord(r.agent);
  return {
    hostname: str(r.hostname),
    os: str(r.os),
    osVersion: str(r.os_version) ?? str(r.osVersion),
    arch: str(r.arch),
    cpuCount: num(r.cpu_count) ?? num(r.cpuCount),
    cpuPercent: num(r.cpu_percent) ?? num(r.cpuPercent),
    ramTotal: num(r.ram_total) ?? num(r.ramTotal),
    ramUsed: num(r.ram_used) ?? num(r.ramUsed),
    ramPercent: num(r.ram_percent) ?? num(r.ramPercent),
    diskTotal: num(r.disk_total) ?? num(r.diskTotal),
    diskUsed: num(r.disk_used) ?? num(r.diskUsed),
    diskPercent: num(r.disk_percent) ?? num(r.diskPercent),
    uptimeSeconds: num(r.uptime_seconds) ?? num(r.uptimeSeconds),
    primaryIp: str(r.primary_ip) ?? str(r.primaryIp),
    gatewayVersion: str(r.gateway_version) ?? str(r.gatewayVersion),
    intakeDir: str(r.intake_dir) ?? str(r.intakeDir),
    agentActive: r.agent === undefined ? undefined : agent.active === true,
    agentProvider: str(agent.provider),
    agentModel: str(agent.model),
  };
}

/** GET /api/v1/system/info — throws ApiError when unreachable/unauthorized. */
export async function fetchSystemInfo(conn: DesktopConnection): Promise<DesktopSystemInfo> {
  const data = await request<unknown>(conn, '/api/v1/system/info', { method: 'GET' }, TIMEOUT_MS);
  return normalizeSystemInfo(data);
}
