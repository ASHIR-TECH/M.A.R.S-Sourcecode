import { RelayClient } from './RelayClient';

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

  // expose the fire-on-close hook used by tests
  _fireClose() {
    this.onclose?.();
  }
}

describe('RelayClient', () => {
  let mockSocket: MockWebSocket;

  beforeEach(() => {
    mockSocket = new MockWebSocket();
    (global as any).WebSocket = jest.fn(() => mockSocket as any);
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
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

  it('send() returns true when socket is open', () => {
    const client = new RelayClient('ws://test', 'token123');
    client.connect();
    mockSocket.triggerOpen();

    const result = client.send({ type: 'chat_message', sessionId: 's1', text: 'hi' });
    expect(result).toBe(true);
  });

  it('reconnects with backoff when onclose fires while shouldReconnect', () => {
    const client = new RelayClient('ws://test', 'token123');
    client.connect();
    mockSocket.triggerOpen();

    mockSocket._fireClose();

    // after backoff (1000ms), connect() should have been called again
    jest.advanceTimersByTime(1001);
    expect((global as any).WebSocket).toHaveBeenCalledTimes(2);
  });
});
