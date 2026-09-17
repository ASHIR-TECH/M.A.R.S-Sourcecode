import { usePairingStore } from '../store/usePairingStore';
import { useDeviceStore } from '../store/useDeviceStore';
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

export interface AppChatContext {
  pairedDesktop: { id: string; name: string } | null;
  devices: AppContextDevice[];
}

/**
 * Snapshot of app-level state attached to fallback (quick-response) chat
 * messages so the AI can answer questions about the user's paired desktop and
 * visible nodes — data the stateless backend would otherwise have no access to.
 * Read-only: the model is told to never invent devices outside this list.
 */
export function buildAppChatContext(): AppChatContext {
  const paired = usePairingStore.getState().pairedDesktop;
  const devices = useDeviceStore.getState().devices as Partial<DeviceWithMetrics>[];

  return {
    pairedDesktop: paired ? { id: paired.desktopId, name: paired.desktopName } : null,
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
