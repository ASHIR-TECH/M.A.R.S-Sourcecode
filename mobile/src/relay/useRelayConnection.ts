import { useEffect, useRef } from 'react';
import { RelayClient } from './RelayClient';
import { usePairingStore } from '../store/usePairingStore';
import { useDeviceStore } from '../store/useDeviceStore';
import { useChatStore } from '../store/useChatStore';
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
          appendChatResponse(message.sessionId, message.text, message.timestamp);
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

  return { send };
}
