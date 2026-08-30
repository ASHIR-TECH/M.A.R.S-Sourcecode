# Phase 6 — Relay Client (Cloud WebSocket Layer)

**Module:** `relay/`
**Depends on:** Phase 5 (`usePairingStore` — provides `relayUrl` + `pairingToken`), Phase 2 (`useAuthStore` — user session)
**Blocks:** Live data for Home (Phase 3), Device Hub (future phase), AI Chat (future phase) — this phase makes the mock stores from earlier phases swappable for real data

---

## 1. Requirements

### 1.1 Functional Requirements
| ID | Requirement |
|----|-------------|
| FR-1 | App establishes a WebSocket connection to the `relayUrl` from the pairing payload once a device is paired and the user is authenticated |
| FR-2 | Connection authenticates itself to the relay using the `pairingToken` immediately upon opening |
| FR-3 | Client can send two categories of outbound message: **commands** (e.g. trigger an action on a node) and **chat messages** (to the AI Co-Pilot) |
| FR-4 | Client receives and routes two categories of inbound message: **state updates** (device/node stats) and **chat responses** |
| FR-5 | Inbound state updates are written into `useDeviceStore`, replacing/updating the mock data introduced in Phase 3, without requiring changes to any screen that reads from that store |
| FR-6 | Inbound chat responses are written into `useChatStore` / a chat-session store |
| FR-7 | Connection automatically reconnects with backoff if dropped, and exposes a `connectionStatus` (`connecting | connected | disconnected | error`) that UI can render (e.g. a banner) |
| FR-8 | If the pairing token is rejected by the relay (expired/invalid), the client surfaces a distinct `auth_failed` status so the UI can prompt re-pairing rather than retrying forever |

### 1.2 Non-Functional Requirements
| ID | Requirement |
|----|-------------|
| NFR-1 | Message contracts (all inbound/outbound shapes) are defined as a single typed union so adding a new message type is additive and type-checked everywhere it's consumed |
| NFR-2 | The client is usable against a local mock WebSocket server for development without requiring the real desktop agent to exist yet |
| NFR-3 | Reconnection uses exponential backoff with a sane cap, not a tight retry loop |
| NFR-4 | The relay client itself has zero React imports — it's a plain class/module; React only touches it through a thin hook (`useRelayConnection`) |
| NFR-5 | No message is ever sent while the socket is not in an `OPEN` state (outbound sends are queued or rejected safely, never thrown as an uncaught error) |

### 1.3 Out of Scope (deferred)
- The actual desktop-side agent implementation (out of scope for this mobile-focused build entirely)
- Message-level encryption beyond `wss://` transport security (flagged as a fast-follow if end-to-end encryption is required)
- Multi-desktop simultaneous connections (this phase assumes one active paired desktop; multi-desktop is a future extension of the same message contract)

---

## 2. Architecture & Design Decisions

### 2.1 Typed message contract, shared vocabulary
All relay traffic is defined as a single discriminated union up front. This is the single most important artifact of this phase — everything else hangs off it:

```ts
// Outbound (mobile → relay → desktop)
type OutboundMessage =
  | { type: 'command'; nodeId: string; action: string; params?: Record<string, unknown> }
  | { type: 'chat_message'; sessionId: string; text: string };

// Inbound (desktop → relay → mobile)
type InboundMessage =
  | { type: 'state_update'; devices: Device[] }
  | { type: 'chat_response'; sessionId: string; text: string; timestamp: string }
  | { type: 'auth_ack' }
  | { type: 'auth_rejected'; reason: string };
```

Note `Device` here is the **exact same interface** defined in Phase 3 for mock data — this is why Phase 3 was built to mirror the anticipated contract: the relay's `state_update` message can now populate `useDeviceStore` with zero shape translation.

### 2.2 Class-based client, hook-based consumption
`RelayClient` is a plain TypeScript class wrapping the native `WebSocket`, with no React dependency — this makes it usable in tests, in a Node mock server, or from any future non-React context (e.g. a background task) without modification.

`useRelayConnection()` is a thin hook that:
- Instantiates/reuses a singleton `RelayClient`
- Subscribes to its `onMessage`/`onStatusChange` callbacks
- Dispatches inbound messages into the relevant zustand stores
- Exposes `connectionStatus` and a `send()` function to components

This mirrors the same layering decision made for auth (Phase 2: provider modules vs. store vs. screen) and pairing (Phase 5: pure validation vs. store vs. screen) — a consistent pattern across the whole app: **pure/testable core → thin store/hook → dumb screen.**

### 2.3 Reconnection strategy
Exponential backoff (1s → 2s → 4s → 8s → capped at 30s), reset to the initial delay on any successful connection. A distinct `auth_failed` terminal state exists specifically so the client does **not** keep retrying against a token the relay has explicitly rejected — that's a pairing problem, not a transient network problem, and should route the user back to Phase 5's QR flow instead of retrying forever.

### 2.4 Development without the real desktop agent
Because `relayUrl` is just a WebSocket URL, a minimal Node `ws` mock server can stand in for the real desktop agent during development — it just needs to speak the same `InboundMessage`/`OutboundMessage` contract. This is included below (§5.6) so Phase 6 is independently testable end-to-end without blocking on desktop-side work.

---

## 3. File Structure

```
src/
  relay/
    types.ts                        # OutboundMessage, InboundMessage unions
    RelayClient.ts                   # plain class, WebSocket wrapper
    RelayClient.test.ts
    useRelayConnection.ts            # React hook bridging RelayClient to stores
  store/
    useDeviceStore.ts                # MODIFIED: gains a "hydrate from relay" action
    useChatStore.ts                  # MODIFIED: gains a "hydrate from relay" action
    useConnectionStore.ts             # NEW: connectionStatus, exposed for a status banner
  components/
    ConnectionStatusBanner.tsx        # small banner shown when disconnected/reconnecting
dev/
  mockRelayServer.js                  # local ws server for development/testing
```

---

## 4. Dependencies

No new Expo packages required — native `WebSocket` is available in React Native by default. For local development only:

```bash
npm install --save-dev ws
```

---

## 5. Implementation

### 5.1 Message contract

```ts
// src/relay/types.ts
import { Device } from '../types/device';

export interface OutboundCommandMessage {
  type: 'command';
  nodeId: string;
  action: string;
  params?: Record<string, unknown>;
}

export interface OutboundChatMessage {
  type: 'chat_message';
  sessionId: string;
  text: string;
}

export type OutboundMessage = OutboundCommandMessage | OutboundChatMessage;

export interface InboundStateUpdate {
  type: 'state_update';
  devices: Device[];
}

export interface InboundChatResponse {
  type: 'chat_response';
  sessionId: string;
  text: string;
  timestamp: string;
}

export interface InboundAuthAck {
  type: 'auth_ack';
}

export interface InboundAuthRejected {
  type: 'auth_rejected';
  reason: string;
}

export type InboundMessage =
  | InboundStateUpdate
  | InboundChatResponse
  | InboundAuthAck
  | InboundAuthRejected;

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'auth_failed' | 'error';
```

### 5.2 The relay client (pure class, no React)

```ts
// src/relay/RelayClient.ts
import { InboundMessage, OutboundMessage, ConnectionStatus } from './types';

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

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
      this.send({ type: 'command', nodeId: '__auth__', action: 'authenticate', params: { token: this.pairingToken } });
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
    if (this.socket?.readyState !== WebSocket.OPEN) {
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
```

> **Note on the auth handshake:** modeling authentication as a `command` message (`action: 'authenticate'`) is one reasonable convention — if your relay protocol prefers a dedicated first frame or a URL query param (`wss://relay.example.com?token=...`) instead, swap the `connect()`/`onopen` logic accordingly. This is the one piece of this phase that must match whatever the relay/desktop side actually implements, so treat it as a contract to confirm, not a fixed decision.

### 5.3 Connection status store

```ts
// src/store/useConnectionStore.ts
import { create } from 'zustand';
import { ConnectionStatus } from '../relay/types';

interface ConnectionState {
  status: ConnectionStatus;
  setStatus: (status: ConnectionStatus) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'disconnected',
  setStatus: (status) => set({ status }),
}));
```

### 5.4 Wiring inbound messages into existing stores

```ts
// src/store/useDeviceStore.ts (additions to the Phase 3 version)
// ... existing imports and state ...

interface DeviceState {
  devices: Device[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filteredDevices: () => Device[];
  hydrateFromRelay: (devices: Device[]) => void; // NEW
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: mockDevices, // overwritten once hydrateFromRelay fires post-connection
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  filteredDevices: () => {
    /* unchanged from Phase 3 */
    const { devices, searchQuery } = get();
    if (!searchQuery.trim()) return devices;
    const q = searchQuery.toLowerCase();
    return devices.filter((d) => d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q));
  },
  hydrateFromRelay: (devices) => set({ devices }),
}));
```

```ts
// src/store/useChatStore.ts (additions to the Phase 3 version)
interface ChatState {
  chats: ChatPreview[];
  appendChatResponse: (sessionId: string, text: string, timestamp: string) => void; // NEW
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: mockChats,
  appendChatResponse: (sessionId, text, timestamp) => {
    // Minimal v1: update matching session's preview row.
    // Full message-thread storage belongs to the AI Chat screen's own phase.
    set({
      chats: get().chats.map((c) =>
        c.id === sessionId ? { ...c, lastMessage: text, timestamp } : c
      ),
    });
  },
}));
```

### 5.5 The connection hook

```ts
// src/relay/useRelayConnection.ts
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
```

### 5.6 Connection status banner (UI consumer)

```tsx
// src/components/ConnectionStatusBanner.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useConnectionStore } from '../store/useConnectionStore';
import { colors } from '../theme/colors';

const STATUS_COPY: Record<string, string> = {
  connecting: 'Connecting to station…',
  disconnected: 'Connection lost — retrying…',
  auth_failed: 'Pairing expired. Please re-scan your desktop\u2019s QR code.',
  error: 'Connection error — retrying…',
};

export function ConnectionStatusBanner() {
  const status = useConnectionStore((s) => s.status);
  if (status === 'connected') return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{STATUS_COPY[status] ?? ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(232,163,77,0.15)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  text: { color: colors.accent, fontSize: 12 },
});
```

### 5.7 Local mock relay server (development only)

```js
// dev/mockRelayServer.js
const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ port: 8080 });

const mockDevices = [
  { id: 'DEV-091', name: 'CONTRACTOR', os: 'Kali Linux', status: 'online', lastSeen: 'Just Now' },
  { id: 'DEV-022', name: 'WORK-LAPTOP', os: 'Windows 11 Pro', status: 'idle', lastSeen: '14m ago' },
];

wss.on('connection', (ws) => {
  console.log('Mobile client connected');

  ws.on('message', (raw) => {
    const message = JSON.parse(raw.toString());

    if (message.type === 'command' && message.action === 'authenticate') {
      ws.send(JSON.stringify({ type: 'auth_ack' }));
      ws.send(JSON.stringify({ type: 'state_update', devices: mockDevices }));
      return;
    }

    if (message.type === 'chat_message') {
      setTimeout(() => {
        ws.send(
          JSON.stringify({
            type: 'chat_response',
            sessionId: message.sessionId,
            text: `Echo: ${message.text}`,
            timestamp: new Date().toISOString(),
          })
        );
      }, 500);
    }
  });

  // Simulate a periodic live stat tick.
  const interval = setInterval(() => {
    mockDevices[0].status = mockDevices[0].status === 'online' ? 'idle' : 'online';
    ws.send(JSON.stringify({ type: 'state_update', devices: mockDevices }));
  }, 5000);

  ws.on('close', () => clearInterval(interval));
});

console.log('Mock relay server running on ws://localhost:8080');
```

Run with: `node dev/mockRelayServer.js`, and point a locally-generated pairing payload's `relayUrl` at `ws://localhost:8080` (use your machine's LAN IP instead of `localhost` when testing on a physical device).

---

## 6. Testing

```ts
// src/relay/RelayClient.test.ts
import { RelayClient } from './RelayClient';

// Minimal in-memory WebSocket mock for unit testing without a real server.
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  sentMessages: string[] = [];

  send(data: string) {
    this.sentMessages.push(data);
  }
  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }
  triggerOpen() {
    this.onopen?.();
  }
  triggerMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

describe('RelayClient', () => {
  let mockSocket: MockWebSocket;

  beforeEach(() => {
    mockSocket = new MockWebSocket();
    (global as any).WebSocket = jest.fn(() => mockSocket);
  });

  it('sends an authenticate command on open', () => {
    const client = new RelayClient('ws://test', 'token123');
    client.connect();
    mockSocket.triggerOpen();

    const sent = JSON.parse(mockSocket.sentMessages[0]);
    expect(sent.action).toBe('authenticate');
    expect(sent.params.token).toBe('token123');
  });

  it('transitions to connected on auth_ack', () => {
    const client = new RelayClient('ws://test', 'token123');
    const statuses: string[] = [];
    client.onStatusChange((s) => statuses.push(s));

    client.connect();
    mockSocket.triggerOpen();
    mockSocket.triggerMessage({ type: 'auth_ack' });

    expect(statuses).toContain('connected');
  });

  it('transitions to auth_failed and stops reconnecting on auth_rejected', () => {
    const client = new RelayClient('ws://test', 'bad-token');
    const statuses: string[] = [];
    client.onStatusChange((s) => statuses.push(s));

    client.connect();
    mockSocket.triggerOpen();
    mockSocket.triggerMessage({ type: 'auth_rejected', reason: 'expired' });

    expect(statuses).toContain('auth_failed');
  });

  it('routes state_update messages to listeners', () => {
    const client = new RelayClient('ws://test', 'token123');
    const received: any[] = [];
    client.onMessage((m) => received.push(m));

    client.connect();
    mockSocket.triggerOpen();
    mockSocket.triggerMessage({ type: 'state_update', devices: [] });

    expect(received[0].type).toBe('state_update');
  });

  it('send() returns false when socket is not open', () => {
    const client = new RelayClient('ws://test', 'token123');
    client.connect();
    mockSocket.readyState = MockWebSocket.CLOSED;

    const result = client.send({ type: 'chat_message', sessionId: 's1', text: 'hi' });
    expect(result).toBe(false);
  });
});
```

**Manual QA checklist:**
- [ ] With `dev/mockRelayServer.js` running, app connects and Home screen's device list updates from mock relay data instead of static Phase 3 mocks
- [ ] Killing the mock server mid-session shows the `ConnectionStatusBanner` with "Connection lost — retrying…"
- [ ] Restarting the mock server results in automatic reconnection and the banner disappearing
- [ ] Sending a chat message updates the corresponding chat preview with the echoed response
- [ ] Simulating an `auth_rejected` response (temporarily hardcode this in the mock server) shows the re-pairing message and does not enter an infinite retry loop
- [ ] Backoff timing roughly matches spec (1s, 2s, 4s… capped at 30s) — verify via console logs during a sustained outage simulation

---

## 7. Acceptance Criteria (Definition of Done)

- [ ] `RelayClient` has zero React imports and is fully unit tested with a mocked `WebSocket`
- [ ] `useRelayConnection` correctly wires inbound `state_update` → `useDeviceStore` and `chat_response` → `useChatStore` with no shape translation needed (confirms Phase 3's forward-looking types were correct)
- [ ] Reconnection uses exponential backoff and resets on successful reconnect
- [ ] `auth_rejected` is a terminal state distinct from transient disconnects, and surfaces a re-pairing prompt rather than retrying indefinitely
- [ ] `send()` never throws when the socket isn't open — it fails safely and returns a boolean
- [ ] A working local mock relay server exists so this phase (and all screens consuming its data) can be developed and demoed without the real desktop agent
- [ ] `ConnectionStatusBanner` reflects live connection state and is mounted globally
