import { create } from 'zustand';

import { InboxFile, listInbox } from '../desktop/deviceClient';
import { downloadInboxFile } from '../desktop/inboxClient';
import { DesktopConnection } from '../desktop/types';

interface InboxState {
  files: InboxFile[];
  loading: boolean;
  downloadingId: string | null;
  lastError: string | null;
  /** Last successfully downloaded local URI, for the toast/row label. */
  lastSavedUri: string | null;
  refresh: (connection: DesktopConnection, options?: { silent?: boolean }) => Promise<void>;
  download: (connection: DesktopConnection, file: InboxFile) => Promise<string>;
  clear: () => void;
}

/** Files the desktop staged for this phone (desktop → phone transfer inbox). */
export const useInboxStore = create<InboxState>((set, get) => ({
  files: [],
  loading: false,
  downloadingId: null,
  lastError: null,
  lastSavedUri: null,

  refresh: async (connection, options) => {
    if (!options?.silent) set({ loading: true, lastError: null });
    try {
      const files = await listInbox(connection);
      set({ files, loading: false, lastError: null });
    } catch (error) {
      set({
        loading: false,
        lastError: error instanceof Error ? error.message : 'Could not load the inbox.',
      });
    }
  },

  download: async (connection, file) => {
    set({ downloadingId: file.id, lastError: null });
    try {
      const uri = await downloadInboxFile(connection, file);
      set((state) => ({
        downloadingId: null,
        lastSavedUri: uri,
        files: state.files.filter((entry) => entry.id !== file.id),
      }));
      return uri;
    } catch (error) {
      set({
        downloadingId: null,
        lastError: error instanceof Error ? error.message : 'Download failed.',
      });
      throw error;
    }
  },

  clear: () =>
    set({
      files: [],
      loading: false,
      downloadingId: null,
      lastError: null,
      lastSavedUri: null,
    }),
}));

export function peekInboxError(): string | null {
  return useInboxStore.getState().lastError;
}
