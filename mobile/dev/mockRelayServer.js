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
      // Reject the token 'bad-token' to exercise the auth_failed path locally.
      if (message.params && message.params.token === 'bad-token') {
        ws.send(JSON.stringify({ type: 'auth_rejected', reason: 'expired' }));
        return;
      }
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
