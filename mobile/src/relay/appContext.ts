import { usePairingStore } from '../store/usePairingStore';
import { useDeviceStore } from '../store/useDeviceStore';
import { useDesktopSystemStore } from '../store/useDesktopSystemStore';
import { DeviceWithMetrics } from '../types/device';

export interface AppContextDevice {
  id: string;
  name: string;
  os: string;
  status: string;
  lastSeen: string;
  cpu?: number;
  ram?: number;
}

export interface AppContextDesktop {
  id: string;
  name: string;
  os?: string;
  osVersion?: string;
  arch?: string;
  cpuCount?: number;
  cpuPercent?: number;
  ramPercent?: number;
  ramTotalGb?: number;
  diskPercent?: number;
  uptimeHours?: number;
  ip?: string;
  agentActive?: boolean;
  agentProvider?: string;
  agentModel?: string;
}

export interface AppChatContext {
  pairedDesktop: AppContextDesktop | null;
  devices: AppContextDevice[];
}

function gb(bytes?: number, digits = 1): number | undefined {
  if (typeof bytes !== 'number' || bytes <= 0) return undefined;
  return Math.round((bytes / 1024 ** 3) * 10 ** digits) / 10 ** digits;
}

/**
 * Snapshot of app-level state attached to fallback (quick-response) chat
 * messages so the AI can answer questions about the user's paired desktop and
 * visible nodes — data the stateless backend would otherwise have no access to.
 * Read-only: the model is told to never invent devices outside this list.
 *
 * The desktop's host telemetry comes from the last `/api/v1/system/info` poll
 * (useDesktopSystemStore); when that hasn't landed yet only the pairing-time
 * identity is attached, which keeps the shape honest rather than guessing.
 */
export function buildAppChatContext(): AppChatContext {
  const paired = usePairingStore.getState().pairedDesktop;
  const devices = useDeviceStore.getState().devices as Partial<DeviceWithMetrics>[];
  const system = useDesktopSystemStore.getState().info;
  const ramTotalGb = gb(system?.ramTotal);

  const desktop: AppContextDesktop | null = paired
    ? {
        id: paired.desktopId,
        name: system?.hostname || paired.desktopName,
        ...(system?.os ? { os: system.os } : {}),
        ...(system?.osVersion ? { osVersion: system.osVersion } : {}),
        ...(system?.arch ? { arch: system.arch } : {}),
        ...(system?.cpuCount !== undefined ? { cpuCount: system.cpuCount } : {}),
        ...(system?.cpuPercent !== undefined ? { cpuPercent: system.cpuPercent } : {}),
        ...(system?.ramPercent !== undefined ? { ramPercent: system.ramPercent } : {}),
        ...(ramTotalGb !== undefined ? { ramTotalGb } : {}),
        ...(system?.diskPercent !== undefined ? { diskPercent: system.diskPercent } : {}),
        ...(system?.uptimeSeconds !== undefined
          ? { uptimeHours: Math.round((system.uptimeSeconds / 3600) * 10) / 10 }
          : {}),
        ...(system?.primaryIp ? { ip: system.primaryIp } : {}),
        ...(system?.agentActive !== undefined ? { agentActive: system.agentActive } : {}),
        ...(system?.agentProvider ? { agentProvider: system.agentProvider } : {}),
        ...(system?.agentModel ? { agentModel: system.agentModel } : {}),
      }
    : null;

  return {
    pairedDesktop: desktop,
    devices: devices.map((d) => ({
      id: d.id ?? '',
      name: d.name ?? '',
      os: d.os ?? '',
      status: d.status ?? 'offline',
      lastSeen: d.lastSeen ?? '',
      ...(d.cpu !== undefined ? { cpu: d.cpu } : {}),
      ...(d.ram !== undefined ? { ram: d.ram } : {}),
    })),
  };
}
