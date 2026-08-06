import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getAgentStatus, sendAgentMessage } from '@/api/agent';
import type { AgentMessageResponse, AgentStatus } from '@/api/types';

const STATUS_POLL_MS = 5000;

interface AgentContextValue {
  status: AgentStatus | null;
  currentTaskId: string | null;
  sending: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<AgentMessageResponse>;
  refreshStatus: () => Promise<void>;
  clearError: () => void;
}

const AgentContext = createContext<AgentContextValue | undefined>(undefined);

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await getAgentStatus();
      if (mounted.current) setStatus(s);
    } catch {
      // Agent status is best-effort; keep the last known value.
    }
  }, []);

  // Poll agent status every 5 seconds.
  useEffect(() => {
    void refreshStatus();
    const id = setInterval(() => {
      void refreshStatus();
    }, STATUS_POLL_MS);
    return () => clearInterval(id);
  }, [refreshStatus]);

  const sendMessage = useCallback(async (text: string) => {
    setSending(true);
    setError(null);
    try {
      const res = await sendAgentMessage(text);
      if (mounted.current) setCurrentTaskId(res.id);
      return res;
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Failed to send message to the agent.';
      if (mounted.current) setError(message);
      throw e;
    } finally {
      if (mounted.current) setSending(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AgentContextValue>(
    () => ({
      status,
      currentTaskId,
      sending,
      error,
      sendMessage,
      refreshStatus,
      clearError,
    }),
    [status, currentTaskId, sending, error, sendMessage, refreshStatus, clearError]
  );

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgent(): AgentContextValue {
  const ctx = useContext(AgentContext);
  if (!ctx) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return ctx;
}
