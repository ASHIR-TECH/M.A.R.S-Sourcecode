import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { listSessions } from '@/api/peers';
import type { Session } from '@/api/types';

const PEERS_POLL_MS = 8000;

interface PeerContextValue {
  sessions: Session[];
  loading: boolean;
  error: string | null;
  /** Number of currently connected desktop peers (for the tab badge). */
  connectedCount: number;
  /** Fresh fetch — called immediately when polling starts. */
  refresh: () => Promise<void>;
  /** Begin the 8s poll loop (call when the Peers tab gains focus). */
  startPolling: () => void;
  /** Pause the poll loop (call when the Peers tab loses focus). */
  stopPolling: () => void;
  clearError: () => void;
}

const PeerContext = createContext<PeerContextValue | undefined>(undefined);

export function PeerProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const items = await listSessions();
      if (mounted.current) {
        setSessions(items);
        setLoading(false);
        setError(null);
      }
    } catch (e) {
      if (mounted.current) {
        setLoading(false);
        setError(e instanceof Error ? e.message : 'Failed to load peers.');
      }
    }
  }, []);

  // Poll every 8 seconds while the Peers tab is active.
  useEffect(() => {
    if (!active) return;
    void refresh();
    const id = setInterval(() => {
      void refresh();
    }, PEERS_POLL_MS);
    return () => clearInterval(id);
  }, [active, refresh]);

  const startPolling = useCallback(() => setActive(true), []);
  const stopPolling = useCallback(() => setActive(false), []);

  const clearError = useCallback(() => setError(null), []);

  const connectedCount = sessions.length;

  const value = useMemo<PeerContextValue>(
    () => ({
      sessions,
      loading,
      error,
      connectedCount,
      refresh,
      startPolling,
      stopPolling,
      clearError,
    }),
    [sessions, loading, error, connectedCount, refresh, startPolling, stopPolling, clearError]
  );

  return <PeerContext.Provider value={value}>{children}</PeerContext.Provider>;
}

export function usePeers(): PeerContextValue {
  const ctx = useContext(PeerContext);
  if (!ctx) {
    throw new Error('usePeers must be used within a PeerProvider');
  }
  return ctx;
}
