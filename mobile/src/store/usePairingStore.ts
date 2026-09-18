import { create } from 'zustand';
import { PairingPayload } from '../pairing/types';
import { pairingStorage } from '../pairing/pairingStorage';
import { deriveAgentConnection } from '../pairing/deriveAgentConnection';
import { useDesktopStore } from './useDesktopStore';

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
    await pairingStorage.save(payload);
    set({ pairedDesktop: payload });

    // Scanning is the primary way to configure device control: the agent
    // endpoint either comes from the QR outright or is derived from the
    // relay URL + pairing token, so pairing is the single setup step.
    const agent = deriveAgentConnection(payload);
    if (agent) {
      await useDesktopStore.getState().saveConnection(agent);
    }
  },

  clearPairing: async () => {
    await pairingStorage.clear();
    set({ pairedDesktop: null });
    await useDesktopStore.getState().clearConnection();
  },

  restorePairing: async () => {
    const stored = await pairingStorage.load();
    if (stored) set({ pairedDesktop: stored });
  },
}));