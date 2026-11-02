import { create } from 'zustand';
import { PairingPayload } from '../pairing/types';
import { pairingStorage } from '../pairing/pairingStorage';
import { deriveAgentConnection } from '../pairing/deriveAgentConnection';
import { useDesktopStore } from './useDesktopStore';
import { useDeviceStore } from './useDeviceStore';
import { fetchSystemInfo } from '../desktop/systemClient';
import { registerDevice } from '../desktop/deviceClient';

function pairedDeviceFrom(payload: PairingPayload) {
  return {
    id: payload.desktopId,
    name: payload.desktopName,
    os: 'Desktop',
    status: 'online' as const,
    lastSeen: 'Just Now',
    cpu: 0,
    ram: 0,
    collectionId: 'paired',
  };
}

interface PairingState {
  pairedDesktop: PairingPayload | null;
  setPairedDesktop: (payload: PairingPayload) => Promise<void>;
  clearPairing: () => Promise<void>;
  restorePairing: () => Promise<void>;
}

/**
 * Desktop-pairing state, kept separate from auth (PHASE_5 §2.5): signing out
 * must not un-pair a desktop, and vice-versa.
 */
export const usePairingStore = create<PairingState>((set) => ({
  pairedDesktop: null,

  setPairedDesktop: async (payload) => {
    // A QR is only a connection invitation. Do not show a locally saved
    // "paired" device until the advertised gateway has accepted the exact
    // credential from the QR; otherwise MARS looks connected while ADTP has
    // rejected the socket and knows nothing about the phone.
    const agent = deriveAgentConnection(payload);
    if (!agent) {
      throw new Error('This pairing code does not contain a reachable ADTP gateway.');
    }
    // `/system/info` is authenticated (unlike readiness), so this verifies
    // both LAN reachability and the QR bearer token before persisting state.
    await fetchSystemInfo(agent);
    // Pairing is two-sided: register this phone in the desktop's device
    // registry so ADTP can list it, show its telemetry and send it files.
    await registerDevice(agent);

    await pairingStorage.save(payload);
    await useDesktopStore.getState().saveConnection(agent);
    set({ pairedDesktop: payload });

    useDeviceStore.getState().addPairedDevice(pairedDeviceFrom(payload));
  },

  clearPairing: async () => {
    await pairingStorage.clear();
    set({ pairedDesktop: null });
    useDeviceStore.getState().removePairedDevice();
    await useDesktopStore.getState().clearConnection();
  },

  restorePairing: async () => {
    const stored = await pairingStorage.load();
    if (stored) {
      set({ pairedDesktop: stored });
      useDeviceStore.getState().addPairedDevice(pairedDeviceFrom(stored));
      // Re-announce after a restart so the desktop keeps showing this phone.
      const agent = deriveAgentConnection(stored);
      if (agent) {
        try {
          await registerDevice(agent);
        } catch {
          // Offline start: heartbeat polling will register once reachable.
        }
      }
    }
  },
}));
