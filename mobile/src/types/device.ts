export type DeviceStatus = 'online' | 'idle' | 'offline';

export interface Device {
  id: string;
  name: string;
  os: string;
  status: DeviceStatus;
  lastSeen: string; // pre-formatted relative label, e.g. "Just Now", "14m ago"
}

/**
 * Phase 8: additive extension of Device for the Device Hub. cpu/ram/collectionId
 * are extra fields, NOT a redefinition — the relay (Phase 6) can send this shape
 * and Home (which only reads the base fields) keeps working untouched.
 */
export interface DeviceWithMetrics extends Device {
  cpu: number; // 0-100
  ram: number; // 0-100
  collectionId: string;
}
