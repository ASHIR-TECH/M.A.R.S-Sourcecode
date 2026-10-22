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
  cpuPercent?: number;
  ramPercent?: number;
}

export interface AppChatContext {
  pairedDesktop: AppContextDesktop | null;
  devices: AppContextDevice[];
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

  const desktop: AppContextDesktop | null = paired
    ? {
        id: paired.desktopId,
        name: system?.hostname || paired.desktopName,
        ...(system?.os ? { os: system.os } : {}),
        ...(system?.cpuPercent !== undefined ? { cpuPercent: system.cpuPercent } : {}),
        ...(system?.ramPercent !== undefined ? { ramPercent: system.ramPercent } : {}),
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
