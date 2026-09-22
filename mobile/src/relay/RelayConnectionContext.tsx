import React, { createContext, useContext, useMemo } from 'react';
import { useRelayConnection } from './useRelayConnection';
import { OutboundMessage } from './types';

interface RelayConnectionApi {
  send: (message: OutboundMessage) => boolean;
  sendChatMessage: (sessionId: string, text: string) => Promise<void>;
}

const RelayConnectionContext = createContext<RelayConnectionApi | null>(null);

/**
 * Owns the single WebSocket to the paired desktop for the whole tab shell.
 * Every screen reads the API from here instead of calling `useRelayConnection`
 * itself — two call sites meant two sockets and duplicate inbound handling.
 */
export function RelayConnectionProvider({ children }: { children: React.ReactNode }) {
  const { send, sendChatMessage } = useRelayConnection();
  const value = useMemo(() => ({ send, sendChatMessage }), [send, sendChatMessage]);
  return <RelayConnectionContext.Provider value={value}>{children}</RelayConnectionContext.Provider>;
}

export function useRelayConnectionApi(): RelayConnectionApi {
  const api = useContext(RelayConnectionContext);
  if (!api) {
    throw new Error('useRelayConnectionApi must be used within a RelayConnectionProvider');
  }
  return api;
}
