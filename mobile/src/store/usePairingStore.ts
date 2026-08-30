import { create } from 'zustand';
import { PairingPayload } from '../pairing/types';
import { pairingStorage } from '../pairing/pairingStorage';

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
  },

  clearPairing: async () => {
    await pairingStorage.clear();
    set({ pairedDesktop: null });
  },

  restorePairing: async () => {
    const stored = await pairingStorage.load();
    if (stored) set({ pairedDesktop: stored });
  },
}));