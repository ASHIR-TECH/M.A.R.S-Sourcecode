import { create } from 'zustand';
import { DesktopConnection } from '../desktop/types';
import { desktopStorage } from '../desktop/desktopStorage';

interface DesktopState {
  connection: DesktopConnection | null;
  hydrated: boolean;
  /** Persists to secure storage and makes it the active connection. */
  saveConnection: (connection: DesktopConnection) => Promise<void>;
  /** Clears the stored token (e.g. on a 401 or sign-out). */
  clearConnection: () => Promise<void>;
  hydrate: () => Promise<void>;
  isConfigured: () => boolean;
}

export const useDesktopStore = create<DesktopState>((set, get) => ({
  connection: null,
  hydrated: false,

  saveConnection: async (connection) => {
    await desktopStorage.save(connection);
    set({ connection });
  },

  clearConnection: async () => {
    await desktopStorage.clear();
    set({ connection: null });
  },

  hydrate: async () => {
    const connection = await desktopStorage.load();
    set({ connection, hydrated: true });
  },

  isConfigured: () => {
    const { connection } = get();
    return !!connection?.baseUrl && !!connection?.token;
  },
}));
