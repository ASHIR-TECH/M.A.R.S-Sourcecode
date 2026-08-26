import { create } from 'zustand';
import { Device } from '../types/device';
import { mockDevices } from '../data/mockDevices';

interface DeviceState {
  devices: Device[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredDevices: () => Device[];
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: mockDevices, // TODO(relay): replace with live subscription in a later phase
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
}));
