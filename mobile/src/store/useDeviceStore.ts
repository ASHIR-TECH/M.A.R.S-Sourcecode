import { create } from 'zustand';
import { Device, DeviceWithMetrics } from '../types/device';

interface DeviceState {
  devices: Device[];
  pairedDevice: DeviceWithMetrics | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredDevices: () => Device[];
  addPairedDevice: (device: DeviceWithMetrics) => void;
  removePairedDevice: () => void;
  hydrateFromRelay: (devices: Device[]) => void;
  renameDevice: (id: string, updates: { name?: string; os?: string }) => void;
  removeDevice: (id: string) => void;
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: [],
  pairedDevice: null,
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  filteredDevices: () => {
    const { devices, searchQuery } = get();
    if (!searchQuery.trim()) return devices;
    const q = searchQuery.toLowerCase();
    return devices.filter(
      (d) => d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q)
    );
  },
  addPairedDevice: (device) =>
    set((s) => ({
      pairedDevice: device,
      devices: [device, ...s.devices.filter((d) => d.id !== device.id)],
    })),
  removePairedDevice: () =>
    set((s) => {
      const paired = s.pairedDevice;
      if (!paired) return s;
      return {
        pairedDevice: null,
        devices: s.devices.filter((d) => d.id !== paired.id),
      };
    }),
  hydrateFromRelay: (devices) =>
    set((s) => {
      const paired = s.pairedDevice;
      if (paired && !devices.some((d) => d.id === paired.id)) {
        return { devices: [paired, ...devices] };
      }
      return { devices };
    }),
  renameDevice: (id, updates) =>
    set((s) => ({
      devices: s.devices.map((d) => (d.id === id ? { ...d, ...updates } : d)),
      pairedDevice:
        s.pairedDevice && s.pairedDevice.id === id
          ? { ...s.pairedDevice, ...updates }
          : s.pairedDevice,
    })),
  removeDevice: (id) =>
    set((s) => ({
      devices: s.devices.filter((d) => d.id !== id),
      pairedDevice: s.pairedDevice && s.pairedDevice.id === id ? null : s.pairedDevice,
    })),
}));
