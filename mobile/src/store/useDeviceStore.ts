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
  /** Refresh the paired desktop's live fields (name/os/cpu/ram) from the API. */
  updatePairedDevice: (updates: Partial<DeviceWithMetrics>) => void;
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
      if (!paired) return { devices };
      // The relay's state_update only carries identity + presence. Merge it
      // into the pinned card instead of replacing it, otherwise the polled
      // CPU/RAM/battery telemetry would disappear every few seconds.
      let mergedPaired = paired;
      const merged = devices.map((device) => {
        if (device.id !== paired.id) return device;
        mergedPaired = { ...paired, ...device };
        // A user rename outranks the hostname the relay advertises.
        if (paired.nameLocked) mergedPaired.name = paired.name;
        return mergedPaired;
      });
      const hasPaired = merged.some((device) => device.id === paired.id);
      return {
        devices: hasPaired ? merged : [mergedPaired, ...merged],
        pairedDevice: mergedPaired,
      };
    }),
  renameDevice: (id, updates) =>
    set((s) => {
      const locked = updates.name !== undefined ? { nameLocked: true } : {};
      return {
        devices: s.devices.map((d) =>
          d.id === id ? { ...d, ...updates, ...locked } : d
        ),
        pairedDevice:
          s.pairedDevice && s.pairedDevice.id === id
            ? { ...s.pairedDevice, ...updates, ...locked }
            : s.pairedDevice,
      };
    }),
  updatePairedDevice: (updates) =>
    set((s) => {
      const paired = s.pairedDevice;
      if (!paired) return s;
      // Only fill fields the caller actually provided, so a partial telemetry
      // refresh can never blank out a good value with `undefined`.
      const provided = Object.fromEntries(
        Object.entries(updates).filter(([, value]) => value !== undefined)
      ) as Partial<DeviceWithMetrics>;
      // Names the user chose are sticky: system polling reports the raw
      // hostname (`adtp-kali`) and must not undo a rename.
      if (paired.nameLocked) delete provided.name;
      const next = { ...paired, ...provided };
      return {
        pairedDevice: next,
        devices: s.devices.map((d) => (d.id === next.id ? { ...d, ...provided } : d)),
      };
    }),
  removeDevice: (id) =>
    set((s) => ({
      devices: s.devices.filter((d) => d.id !== id),
      pairedDevice: s.pairedDevice && s.pairedDevice.id === id ? null : s.pairedDevice,
    })),
}));
