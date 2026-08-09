import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getReady } from '@/api/health';

interface UseConnectionResult {
  /** Whether the desktop peer is reachable. `null` before the first probe. */
  isOnline: boolean | null;
  /** Round-trip latency of the last readiness probe, in milliseconds. */
  latencyMs: number | null;
  /** True while a probe is in flight. */
  probing: boolean;
  /** Run a fresh readiness probe now. */
  refresh: () => Promise<void>;
}

/**
 * Checks desktop reachability when the app returns to the foreground and on
 * mount. Powers the chat header dot + latency readout and the offline banner.
 */
export function useConnection(): UseConnectionResult {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [probing, setProbing] = useState(false);

  const refresh = useCallback(async () => {
    setProbing(true);
    const startedAt = Date.now();
    try {
      await getReady();
      setLatencyMs(Date.now() - startedAt);
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    } finally {
      setProbing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return { isOnline, latencyMs, probing, refresh };
}
