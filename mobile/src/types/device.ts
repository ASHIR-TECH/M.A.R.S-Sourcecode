export type DeviceStatus = 'online' | 'idle' | 'offline';

export interface Device {
  id: string;
  name: string;
  os: string;
  status: DeviceStatus;
  lastSeen: string; // pre-formatted relative label, e.g. "Just Now", "14m ago"
}
