import { useCallback, useEffect, useRef } from 'react';
import { RelayClient } from './RelayClient';
import { sendFallbackMessage } from './fallbackChatClient';
import { buildAppChatContext } from './appContext';
import { runAgentChat } from '../desktop/agentChat';
import { fetchSystemInfo } from '../desktop/systemClient';
import { uploadFile } from '../desktop/transferClient';
import { ApiError } from '../desktop/errors';
import { AgentToolCall, TransferReference } from '../desktop/types';
import { deriveRelayUrl } from '../pairing/deriveAgentConnection';
import { usePairingStore } from '../store/usePairingStore';
import { useDeviceStore } from '../store/useDeviceStore';
import { useChatStore } from '../store/useChatStore';
import { useChatSessionStore } from '../store/useChatSessionStore';
import { useConnectionStore } from '../store/useConnectionStore';
import { useDesktopStore } from '../store/useDesktopStore';
import { useDesktopSystemStore } from '../store/useDesktopSystemStore';
import { ChatAttachment } from '../types/chatMessage';
import { OutboundMessage } from './types';

const SYSTEM_POLL_MS = 20000;

function basename(path: string): string {
  const cleaned = path.replace(/\\/g, '/');
  return cleaned.slice(cleaned.lastIndexOf('/') + 1) || cleaned;
}

/** Lifts completed send/receive tool calls into file tiles for the reply bubble. */
function transfersFromToolCalls(toolCalls: AgentToolCall[] | undefined): TransferReference[] {
  if (!toolCalls) return [];
  return toolCalls
    .filter((tc) => tc.name === 'send_file' || tc.name === 'receive_file')
    .filter((tc) => tc.status === 'completed')
    .map((tc) => {
      const params = tc.params ?? {};
      const filePath = String(params.file_path ?? params.file ?? params.path ?? '');
      return {
        fileName: basename(filePath) || 'file',
        direction: tc.name === 'send_file' ? 'outgoing' : 'incoming',
        peerName: String(params.peer_id ?? params.peer ?? '').trim() || undefined,
        sizeBytes: typeof params.size_bytes === 'number' ? params.size_bytes : undefined,
        result: tc.result,
      };
    });
}

export function useRelayConnection() {
  const pairedDesktop = usePairingStore((s) => s.pairedDesktop);
  const hydrateDevices = useDeviceStore((s) => s.hydrateFromRelay);
  const appendChatResponse = useChatStore((s) => s.appendChatResponse);
  const setConnectionStatus = useConnectionStore((s) => s.setStatus);
  const clientRef = useRef<RelayClient | null>(null);

  useEffect(() => {
    if (!pairedDesktop) return;

    // The QR's relayUrl is the public QoWT relay (QUIC frames), not a MARS
    // message bus, so dial the desktop's own gateway /relay instead. Falling
    // back to relayUrl keeps manual/legacy payloads working.
    const client = new RelayClient(
      deriveRelayUrl(pairedDesktop),
      pairedDesktop.pairingToken,
      pairedDesktop.desktopId
    );
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

  // Poll the desktop's host telemetry while paired: it feeds the Home card's
  // CPU/RAM, the AI app-context, and doubles as a REST reachability check.
  useEffect(() => {
    if (!pairedDesktop) {
      useDesktopSystemStore.getState().clear();
      return;
    }

    let cancelled = false;

    const poll = async () => {
      const desktop = useDesktopStore.getState();
      if (!desktop.connection || !desktop.isConfigured()) return;
      try {
        const info = await fetchSystemInfo(desktop.connection);
        if (cancelled) return;
        useDesktopSystemStore.getState().setInfo(info);
        // Fold the live identity + metrics onto the paired device card.
        useDeviceStore.getState().updatePairedDevice({
          name: info.hostname || undefined,
          os: info.os || undefined,
          status: 'online',
          lastSeen: 'Just Now',
          cpu: info.cpuPercent !== undefined ? Math.round(info.cpuPercent) : undefined,
          ram: info.ramPercent !== undefined ? Math.round(info.ramPercent) : undefined,
          batteryPercent:
            info.batteryPresent !== false && info.batteryPercent !== undefined
              ? Math.round(info.batteryPercent)
              : undefined,
          batteryCharging: info.batteryCharging,
        });
      } catch {
        // Leave the last snapshot in place; the relay/status banner already
        // communicates an unreachable desktop. A transient failure is noise.
      }
    };

    void poll();
    const timer = setInterval(poll, SYSTEM_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pairedDesktop]);

  // Stable identity: both close over the ref + module-level `getState()` reads,
  // so consumers can safely depend on them without re-running effects.
  const send = useCallback((message: OutboundMessage): boolean => {
    return clientRef.current?.send(message) ?? false;
  }, []);

  /**
   * Hands a picked file to the desktop and returns the path it landed at, or an
   * error string to show the user. Only REST can move the bytes: /transfers/send
   * takes a desktop-local path and the QUIC data plane has no mobile client.
   */
  const deliverAttachment = useCallback(
    async (attachment: ChatAttachment): Promise<{ path?: string; error?: string }> => {
      const desktop = useDesktopStore.getState();
      if (!desktop.connection || !desktop.isConfigured()) {
        return { error: 'no paired desktop is configured' };
      }
      if (!attachment.uri) {
        return { error: 'the picked file had no readable location' };
      }
      try {
        const uploaded = await uploadFile(desktop.connection, {
          uri: attachment.uri,
          name: attachment.name,
          mimeType: attachment.mimeType,
        });
        return { path: uploaded.path };
      } catch (error) {
        if (error instanceof ApiError && error.kind === 'auth') {
          void desktop.clearConnection();
        }
        return { error: error instanceof Error ? error.message : 'the upload failed' };
      }
    },
    []
  );

  /**
   * Routes a chat message to the paired desktop when it's reachable, otherwise
   * transparently falls back to quick-response mode (PHASE_12 FR-3/NFR-2).
   * The routing decision lives here — never in the Chat screen.
   *
   * When the user attached a file, its bytes are uploaded to the desktop first
   * and the returned desktop path is appended to the text, so the desktop agent
   * can open, move or re-send the file it just received.
   */
  const sendChatMessage = useCallback(
    async (sessionId: string, text: string, attachment?: ChatAttachment): Promise<void> => {
      const timestamp = () => new Date().toISOString();
      let outgoing = text;

      if (attachment) {
        const { path, error } = await deliverAttachment(attachment);
        if (path) {
          outgoing = text
            ? `${text}\n\n[Attached file delivered to this desktop at: ${path}]`
            : `[Attached file delivered to this desktop at: ${path}]`;
        } else {
          useChatSessionStore
            .getState()
            .addAiMessage(
              sessionId,
              `I couldn't receive "${attachment.name}" — ${error}. Attach the file again once a desktop is paired.`,
              timestamp(),
              { viaFallback: true }
            );
          if (!text) return;
        }
      }

      // Preferred path: the desktop's embedded agent over REST (PHASE_14). It owns
      // the tool loop, so this is what can actually command other devices.
      const desktop = useDesktopStore.getState();
      if (desktop.connection && desktop.isConfigured()) {
        try {
          const reply = await runAgentChat(desktop.connection, outgoing, sessionId);
          const at = timestamp();
          const replyText = reply.text || 'Done.';
          useChatSessionStore.getState().addAiMessage(sessionId, replyText, at, {
            toolCalls: reply.toolCalls,
            transfers: transfersFromToolCalls(reply.toolCalls),
            ...(reply.providerLabel ? { providerLabel: reply.providerLabel } : {}),
          });
          useChatStore.getState().appendChatResponse(sessionId, replyText, at);
          return;
        } catch (error) {
          // A rejected token is terminal — drop it so the setup UI can re-prompt.
          if (error instanceof ApiError && error.kind === 'auth') {
            void desktop.clearConnection();
          }
          // Otherwise fall through to the relay / quick-response paths below.
        }
      }

      const isDesktopReachable = useConnectionStore.getState().status === 'connected';

      if (isDesktopReachable) {
        const sent = clientRef.current?.send({ type: 'chat_message', sessionId, text: outgoing }) ?? false;
        if (sent) return; // response arrives async via the onMessage handler above
      }

      try {
        const reply = await sendFallbackMessage(outgoing, buildAppChatContext());
        useChatSessionStore
          .getState()
          .addAiMessage(sessionId, reply, timestamp(), { viaFallback: true });
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : 'Sorry, I could not reach any AI service right now. Please try again shortly.';
        useChatSessionStore
          .getState()
          .addAiMessage(sessionId, message, timestamp(), { viaFallback: true });
      }
    },
    [deliverAttachment]
  );

  return { send, sendChatMessage };
}
