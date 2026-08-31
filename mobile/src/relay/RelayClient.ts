import { InboundMessage, OutboundMessage, ConnectionStatus } from './types';

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

// WebSocket.OPEN is a static on the global; tests swap global.WebSocket for a
// mock that lacks it, so use the raw numeric value (spec: readyState 1 = OPEN).
const WS_OPEN = 1;

type MessageListener = (message: InboundMessage) => void;
type StatusListener = (status: ConnectionStatus) => void;

export class RelayClient {
  private socket: WebSocket | null = null;
  private url: string;
  private pairingToken: string;
  private backoffMs = INITIAL_BACKOFF_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;
  private messageListeners = new Set<MessageListener>();
  private statusListeners = new Set<StatusListener>();
  private status: ConnectionStatus = 'disconnected';

  constructor(url: string, pairingToken: string) {
    this.url = url;
    this.pairingToken = pairingToken;
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
        params: { token: this.pairingToken },
      });
    };

    this.socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as InboundMessage;
        if (parsed.type === 'auth_ack') {
          this.backoffMs = INITIAL_BACKOFF_MS;
          this.setStatus('connected');
        } else if (parsed.type === 'auth_rejected') {
          this.shouldReconnect = false;
          this.setStatus('auth_failed');
          this.socket?.close();
          return;
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
      if (this.status !== 'auth_failed') this.setStatus('disconnected');
      if (this.shouldReconnect) this.scheduleReconnect();
    };
  }

  disconnect(): void {
    this.shouldReconnect = false;
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

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => {
      this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS);
      this.connect();
    }, this.backoffMs);
  }
}
