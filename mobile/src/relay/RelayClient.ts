import { InboundMessage, OutboundMessage, ConnectionStatus } from './types';

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;
/** Presence keepalive; the gateway marks the phone online on each pong. */
const HEARTBEAT_MS = 20000;

// WebSocket.OPEN is a static on the global; tests swap global.WebSocket for a
// mock that lacks it, so use the raw numeric value (spec: readyState 1 = OPEN).
const WS_OPEN = 1;

type MessageListener = (message: InboundMessage) => void;
type StatusListener = (status: ConnectionStatus) => void;

export class RelayClient {
  private socket: WebSocket | null = null;
  private url: string;
  private pairingToken: string;
  private desktopId?: string;
  private deviceId?: string;
  private backoffMs = INITIAL_BACKOFF_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private shouldReconnect = true;
  private messageListeners = new Set<MessageListener>();
  private statusListeners = new Set<StatusListener>();
  private status: ConnectionStatus = 'disconnected';

  constructor(url: string, pairingToken: string, desktopId?: string, deviceId?: string) {
    this.url = url;
    this.pairingToken = pairingToken;
    this.desktopId = desktopId;
    this.deviceId = deviceId;
  }

  connect(): void {
    this.shouldReconnect = true;
    this.setStatus('connecting');

    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      this.send({
        type: 'command',
        nodeId: '__auth__',
        action: 'authenticate',
        // The desktop id lets the gateway report this machine under the identity
        // the phone paired with, so one desktop renders one grid card.
        params: {
          token: this.pairingToken,
          ...(this.desktopId ? { desktopId: this.desktopId } : {}),
          // Lets the gateway attach this socket to the phone's registry row so
          // the desktop shows it online immediately (no REST heartbeat wait).
          ...(this.deviceId ? { deviceId: this.deviceId } : {}),
        },
      });
    };

    this.socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as InboundMessage;
        if (parsed.type === 'auth_ack') {
          this.backoffMs = INITIAL_BACKOFF_MS;
          this.startHeartbeat();
          this.setStatus('connected');
        } else if (parsed.type === 'auth_rejected') {
          this.shouldReconnect = false;
          this.stopHeartbeat();
          this.setStatus('auth_failed');
          this.socket?.close();
          return;
        } else if (parsed.type === 'ping') {
          // Gateway presence probe — answer so the desktop keeps us online.
          this.send({ type: 'pong' });
        }
        this.messageListeners.forEach((listener) => listener(parsed));
      } catch {
        // Malformed message from relay — drop it, do not crash the app.
        // (NFR-3: never log pairing secrets; we simply ignore bad frames.)
      }
    };

    this.socket.onerror = () => {
      this.setStatus('error');
    };

    this.socket.onclose = () => {
      this.stopHeartbeat();
      if (this.status !== 'auth_failed') this.setStatus('disconnected');
      if (this.shouldReconnect) this.scheduleReconnect();
    };
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.stopHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.close();
    this.socket = null;
  }

  send(message: OutboundMessage): boolean {
    if (this.socket?.readyState !== WS_OPEN) {
      return false; // caller decides whether to queue/retry/no-op
    }
    this.socket.send(JSON.stringify(message));
    return true;
  }

  onMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  /** Presence keepalive while the socket is authenticated. */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, HEARTBEAT_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => {
      this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS);
      this.connect();
    }, this.backoffMs);
  }
}
