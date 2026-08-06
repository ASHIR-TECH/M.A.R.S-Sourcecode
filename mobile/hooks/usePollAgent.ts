import { useEffect, useRef, useState } from 'react';
import { getAgentMessage } from '@/api/agent';
import type { AgentMessage } from '@/api/types';

const DEFAULT_POLL_MS = 1000;
const MAX_POLL_MS = 30_000;

type PollStatus = 'idle' | 'polling' | 'resolved' | 'error';

export interface UsePollAgentResult {
  message: AgentMessage | null;
  status: PollStatus;
  error: string | null;
}

/**
 * Polls GET /api/v1/agent/messages/{id} every second until the message
 * reaches a terminal state (completed / failed). Stops cleanly on unmount.
 */
export function usePollAgent(
  messageId: string | null,
  intervalMs: number = DEFAULT_POLL_MS
): UsePollAgentResult {
  const [message, setMessage] = useState<AgentMessage | null>(null);
  const [status, setStatus] = useState<PollStatus>(messageId ? 'polling' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!messageId) {
      setStatus('idle');
      setMessage(null);
      setError(null);
      return;
    }

    setStatus('polling');
    setMessage(null);
    setError(null);

    let startedAt = Date.now();

    const pollOnce = async () => {
      if (!mountedRef.current || !messageId) return;
      try {
        const msg = await getAgentMessage(messageId);
        if (!mountedRef.current) return;
        setMessage(msg);

        if (msg.status === 'completed') {
          if (timerRef.current) clearInterval(timerRef.current);
          setStatus('resolved');
        } else if (msg.status === 'failed') {
          if (timerRef.current) clearInterval(timerRef.current);
          setStatus('error');
          setError(msg.error ?? 'The agent reported a failure.');
        } else if (Date.now() - startedAt > MAX_POLL_MS) {
          if (timerRef.current) clearInterval(timerRef.current);
          setStatus('error');
          setError('Timed out waiting for the agent response.');
        }
      } catch (e) {
        if (!mountedRef.current) return;
        if (timerRef.current) clearInterval(timerRef.current);
        setStatus('error');
        setError(e instanceof Error ? e.message : 'Failed to fetch the agent response.');
      }
    };

    void pollOnce();
    timerRef.current = setInterval(() => {
      void pollOnce();
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [messageId, intervalMs]);

  return { message, status, error };
}
