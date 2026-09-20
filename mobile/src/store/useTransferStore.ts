import { create } from 'zustand';
import { DesktopConnection, SessionRecord, TransferRecord, WatcherRecord } from '../desktop/types';
import { listSessions, listTransfers, listWatchers } from '../desktop/transferClient';

interface TransferState {
  transfers: TransferRecord[];
  sessions: SessionRecord[];
  watchers: WatcherRecord[];
  loading: boolean;
  lastError: string | null;
  /** Fetches all three lists from the desktop's REST gateway. */
  refresh: (connection: DesktopConnection) => Promise<void>;
  clear: () => void;
}

/** Live transfer/session/watcher data pulled from the desktop peer (PHASE_14). */
export const useTransferStore = create<TransferState>((set) => ({
  transfers: [],
  sessions: [],
  watchers: [],
  loading: false,
  lastError: null,

  refresh: async (connection) => {
    set({ loading: true, lastError: null });
    try {
      const [transfers, sessions, watchers] = await Promise.all([
        listTransfers(connection),
        listSessions(connection),
        listWatchers(connection),
      ]);
      set({ transfers, sessions, watchers, loading: false });
    } catch (error) {
      set({
        loading: false,
        lastError: error instanceof Error ? error.message : 'Could not load transfers.',
      });
    }
  },

  clear: () => set({ transfers: [], sessions: [], watchers: [], lastError: null, loading: false }),
}));