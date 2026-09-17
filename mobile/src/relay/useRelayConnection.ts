import { useEffect, useRef } from 'react';
import { RelayClient } from './RelayClient';
import { sendFallbackMessage } from './fallbackChatClient';
import { buildAppChatContext } from './appContext';
import { usePairingStore } from '../store/usePairingStore';
import { useDeviceStore } from '../store/useDeviceStore';
import { useChatStore } from '../store/useChatStore';
import { useChatSessionStore } from '../store/useChatSessionStore';
import { useConnectionStore } from '../store/useConnectionStore';
import { OutboundMessage } from './types';

export function useRelayConnection() {
  const pairedDesktop = usePairingStore((s) => s.pairedDesktop);
  const hydrateDevices = useDeviceStore((s) => s.hydrateFromRelay);
  const appendChatResponse = useChatStore((s) => s.appendChatResponse);
  const setConnectionStatus = useConnectionStore((s) => s.setStatus);
  const clientRef = useRef<RelayClient | null>(null);

  useEffect(() => {
    if (!pairedDesktop) return;

    const client = new RelayClient(pairedDesktop.relayUrl, pairedDesktop.pairingToken);
    clientRef.current = client;

    const unsubscribeMessages = client.onMessage((message) => {
      switch (message.type) {
        case 'state_update':
          hydrateDevices(message.devices);
          break;
        case 'chat_response':
          // Update both Home's preview row and the full AI-chat thread from the
          // same inbound event (PHASE_9 wiring note). providerLabel is pure
          // display data (PHASE_12 NFR-1) — never branched on.
          appendChatResponse(message.sessionId, message.text, message.timestamp);
          useChatSessionStore.getState().addAiMessage(
            message.sessionId,
            message.text,
            message.timestamp,
            message.providerLabel ? { providerLabel: message.providerLabel } : undefined
          );
          break;
        default:
          break; // auth_ack / auth_rejected are handled inside RelayClient itself
      }
    });

    const unsubscribeStatus = client.onStatusChange(setConnectionStatus);

    client.connect();

    return () => {
      unsubscribeMessages();
      unsubscribeStatus();
      client.disconnect();
      clientRef.current = null;
    };
  }, [pairedDesktop, hydrateDevices, appendChatResponse, setConnectionStatus]);

  const send = (message: OutboundMessage): boolean => {
    return clientRef.current?.send(message) ?? false;
  };

  /**
   * Routes a chat message to the paired desktop when it's reachable, otherwise
   * transparently falls back to quick-response mode (PHASE_12 FR-3/NFR-2).
   * The routing decision lives here — never in the Chat screen.
   */
  const sendChatMessage = async (sessionId: string, text: string): Promise<void> => {
    const isDesktopReachable = useConnectionStore.getState().status === 'connected';

    if (isDesktopReachable) {
      const sent = clientRef.current?.send({ type: 'chat_message', sessionId, text }) ?? false;
      if (sent) return; // response arrives async via the onMessage handler above
    }

    try {
      const reply = await sendFallbackMessage(text, buildAppChatContext());
      useChatSessionStore
        .getState()
        .addAiMessage(sessionId, reply, new Date().toISOString(), { viaFallback: true });
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Sorry, I could not reach any AI service right now. Please try again shortly.';
      useChatSessionStore
        .getState()
        .addAiMessage(sessionId, message, new Date().toISOString(), { viaFallback: true });
    }
  };

  return { send, sendChatMessage };
}
