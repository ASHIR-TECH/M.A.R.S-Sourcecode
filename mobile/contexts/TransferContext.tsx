import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { listTransfers } from '@/api/transfers';
import type { Transfer } from '@/api/types';

const TRANSFERS_POLL_MS = 3000;

interface TransferContextValue {
  transfers: Transfer[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Start the 3s poll loop (call when the Transfers tab gains focus). */
  startPolling: () => void;
  /** Stop the poll loop (call when the tab loses focus). */
  stopPolling: () => void;
  clearError: () => void;
}

const TransferContext = createContext<TransferContextValue | undefined>(undefined);

export function TransferProvider({ children }: { children: React.ReactNode }) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
      const items = await listTransfers(20);
      if (mounted.current) {
        setTransfers(items);
        setLoading(false);
        setError(null);
      }
    } catch (e) {
      if (mounted.current) {
        setLoading(false);
        setError(e instanceof Error ? e.message : 'Failed to load transfers.');
      }
    }
  }, []);

  // Poll every 3 seconds while the tab is focused.
  useEffect(() => {
    if (!active) return;
    void refresh();
    const id = setInterval(() => {
      void refresh();
    }, TRANSFERS_POLL_MS);
    return () => clearInterval(id);
  }, [active, refresh]);

  const startPolling = useCallback(() => {
    setActive(true);
  }, []);

  const stopPolling = useCallback(() => {
    setActive(false);
  }, []);

  const pullToRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<TransferContextValue>(
    () => ({
      transfers,
      loading,
      refreshing,
      error,
      refresh,
      startPolling,
      stopPolling,
      clearError,
    }),
    [transfers, loading, refreshing, error, refresh, startPolling, stopPolling, clearError]
  );

  return <TransferContext.Provider value={value}>{children}</TransferContext.Provider>;
}

export function useTransfers(): TransferContextValue {
  const ctx = useContext(TransferContext);
  if (!ctx) {
    throw new Error('useTransfers must be used within a TransferProvider');
  }
  return ctx;
}
