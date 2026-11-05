import { useCallback, useEffect, useRef, useState } from 'react';
import { RelayClient } from './RelayClient';
import { sendFallbackMessage } from './fallbackChatClient';
import { buildAppChatContext } from './appContext';
import { runAgentChat } from '../desktop/agentChat';
import { fetchSystemInfo } from '../desktop/systemClient';
import {
  DeviceMessage,
  ensureRegistered,
  listMessages,
  markMessageDelivered,
} from '../desktop/deviceClient';
import { getInstallId } from './deviceId';
import { uploadFile } from '../desktop/transferClient';
import { mimeTypeForName } from '../desktop/mime';
import { ApiError } from '../desktop/errors';
import { deriveRelayUrl } from '../pairing/deriveAgentConnection';
import { usePairingStore } from '../store/usePairingStore';
import { useDeviceStore } from '../store/useDeviceStore';
import { useChatStore } from '../store/useChatStore';
import { useChatSessionStore } from '../store/useChatSessionStore';
import { useConnectionStore } from '../store/useConnectionStore';
import { useDesktopStore } from '../store/useDesktopStore';
import { useDesktopSystemStore } from '../store/useDesktopSystemStore';
import { useInboxStore } from '../store/useInboxStore';
import { ChatAttachment } from '../types/chatMessage';
import { OutboundMessage } from './types';
import { transfersFromToolCalls } from './transfers';

const SYSTEM_POLL_MS = 20000;
/** Single-threaded v1 chat; matches ChatComposer's SESSION_ID. */
const CHAT_SESSION_ID = 'default-session';

export function useRelayConnection() {
  const pairedDesktop = usePairingStore((s) => s.pairedDesktop);
  const hydrateDevices = useDeviceStore((s) => s.hydrateFromRelay);
  const appendChatResponse = useChatStore((s) => s.appendChatResponse);
  const setConnectionStatus = useConnectionStore((s) => s.setStatus);
  const clientRef = useRef<RelayClient | null>(null);
  const [installId, setInstallId] = useState<string>();
  const seenDeviceMessages = useRef<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    getInstallId()
      .then((id) => {
        if (alive) setInstallId(id);
      })
      .catch(() => {
        // Registration/presence degrades, but the socket still works with the
        // desktop id alone.
      });
    return () => {
      alive = false;
    };
  }, []);

  /** Append a desktop-originated message exactly once, then ack it. */
  const deliverDeviceMessage = useCallback(async (message: DeviceMessage) => {
    if (seenDeviceMessages.current.has(message.id)) return;
    seenDeviceMessages.current.add(message.id);

    const timestamp = message.createdAt || new Date().toISOString();
    useChatSessionStore
      .getState()
      .addIncomingMessage(CHAT_SESSION_ID, message.text, timestamp, { providerLabel: 'Desktop' });
    useChatStore.getState().appendChatResponse(CHAT_SESSION_ID, message.text, timestamp);

    const desktop = useDesktopStore.getState();
    if (desktop.connection) {
      void markMessageDelivered(desktop.connection, message.id).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!pairedDesktop || !installId) return;

    // The QR's relayUrl is the public QoWT relay (QUIC frames), not a MARS
    // message bus, so dial the desktop's own gateway /relay instead. Falling
    // back to relayUrl keeps manual/legacy payloads working.
    const client = new RelayClient(
      deriveRelayUrl(pairedDesktop),
      pairedDesktop.pairingToken,
      pairedDesktop.desktopId,
      installId
    );
    clientRef.current = client;

    const unsubscribeMessages = client.onMessage((message) => {
      switch (message.type) {
        case 'state_update':
          hydrateDevices(message.devices);
          break;
        case 'chat_response': {
          // Update both Home's preview row and the full AI-chat thread from the
          // same inbound event (PHASE_9 wiring note). providerLabel is pure
          // display data (PHASE_12 NFR-1) — never branched on.
          appendChatResponse(message.sessionId, message.text, message.timestamp);
          const toolCalls = Array.isArray(message.toolCalls) ? message.toolCalls : [];
          useChatSessionStore.getState().addAiMessage(
            message.sessionId,
            message.text,
            message.timestamp,
            {
              ...(message.providerLabel ? { providerLabel: message.providerLabel } : {}),
              ...(toolCalls.length > 0
                ? { toolCalls, transfers: transfersFromToolCalls(toolCalls) }
                : {}),
            }
          );
          break;
        }
        case 'device_message':
          void deliverDeviceMessage({
            id: message.message.id,
            deviceId: message.message.device_id,
            text: message.message.text,
            createdAt: message.message.created_at,
            deliveredAt: message.message.delivered_at ?? null,
          });
          break;
        default:
          break; // auth_ack / auth_rejected / ping / pong
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
  }, [
    pairedDesktop,
    installId,
    hydrateDevices,
    appendChatResponse,
    setConnectionStatus,
    deliverDeviceMessage,
  ]);

  // Poll the desktop's host telemetry while paired: it feeds the Home card's
  // CPU/RAM, the AI app-context, and doubles as a REST reachability check.
  useEffect(() => {
    if (!pairedDesktop) {
      useDesktopSystemStore.getState().clear();
      useInboxStore.getState().clear();
      return;
    }

    let cancelled = false;

    const poll = async () => {
      const desktop = useDesktopStore.getState();
      if (!desktop.connection || !desktop.isConfigured()) return;
      const connection = desktop.connection;
      // Keep this phone visible on the desktop (and register it after an
      // offline start), then pull anything the desktop staged for us.
      void ensureRegistered(connection).catch(() => {});
      void useInboxStore.getState().refresh(connection, { silent: true });
      void (async () => {
        try {
          const messages = await listMessages(connection);
          if (cancelled) return;
          for (const message of messages) {
            // Delivery is idempotent; this also catches messages sent while
            // the app was closed and the live relay socket was down.
            await deliverDeviceMessage(message);
          }
        } catch {
          // Offline/401 is already surfaced by the system poll below.
        }
      })();
      try {
        const info = await fetchSystemInfo(connection);
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
  }, [pairedDesktop, deliverDeviceMessage]);

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
          mimeType: mimeTypeForName(attachment.name, attachment.mimeType),
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
   *
   * Device context is prepended to agent messages so the desktop AI knows which
   * devices are available (name, id, status, cpu, ram, battery) and can target
   * them with send_file_to_device — just like a human user would.
   */
  const sendChatMessage = useCallback(
    async (sessionId: string, text: string, attachment?: ChatAttachment): Promise<void> => {
      const timestamp = () => new Date().toISOString();
      let outgoing = text;
      const attachmentPaths: string[] = [];

      if (attachment) {
        const { path, error } = await deliverAttachment(attachment);
        if (path) {
          attachmentPaths.push(path);
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

      // Build device context so the desktop AI knows about available devices
      // and can target them (e.g. send_file_to_device) like a human user.
      const devices = useDeviceStore.getState().devices;
      const deviceList = devices
        .map((d) => {
          const metrics = d as Partial<import('../types/device').DeviceWithMetrics>;
          const parts = [d.name, `id=${d.id}`, `status=${d.status}`];
          if (metrics.cpu !== undefined) parts.push(`cpu=${metrics.cpu}%`);
          if (metrics.ram !== undefined) parts.push(`ram=${metrics.ram}%`);
          if (metrics.batteryPercent !== undefined)
            parts.push(`battery=${metrics.batteryPercent}%${metrics.batteryCharging ? ' ⚡' : ''}`);
          return parts.join(' | ');
        })
        .join('\n  - ');

      const deviceContext = devices.length > 0
        ? `\n\n[Connected devices:\n  - ${deviceList}\n]`
        : '';

      // Preferred path: the desktop's embedded agent over REST (PHASE_14). It owns
      // the tool loop, so this is what can actually command other devices.
      const desktop = useDesktopStore.getState();
      if (desktop.connection && desktop.isConfigured()) {
        try {
          const reply = await runAgentChat(desktop.connection, outgoing + deviceContext, sessionId, attachmentPaths);
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
        const sent =
          clientRef.current?.send({
            type: 'chat_message',
            sessionId,
            text: outgoing,
            ...(attachmentPaths.length > 0 ? { attachments: attachmentPaths } : {}),
          }) ?? false;
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
