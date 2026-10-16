import { create } from 'zustand';
import { DesktopSystemInfo } from '../desktop/systemClient';

interface DesktopSystemState {
  /** Latest successful /api/v1/system/info snapshot, or null before the first. */
  info: DesktopSystemInfo | null;
  updatedAt: string | null;
  setInfo: (info: DesktopSystemInfo) => void;
  clear: () => void;
}

/**
 * Live host telemetry for the paired desktop. Kept out of `useDeviceStore`
 * because it's read by the Home card, the AI app-context and (later) the
 * Transfers screen, but never persisted — it's a cache of a polled snapshot.
 */
export const useDesktopSystemStore = create<DesktopSystemState>((set) => ({
  info: null,
  updatedAt: null,
  setInfo: (info) => set({ info, updatedAt: new Date().toISOString() }),
  clear: () => set({ info: null, updatedAt: null }),
}));
