/**
 * Generates a PairingPayload QR for local development.
 *
 * Encodes the relay URL AND the Phase 14 desktop-agent REST endpoint, so
 * scanning it with the mobile app pairs and configures device control at once.
 *
 * Run:  node dev/makePairingQr.js
 * Env:  MARS_HOST (LAN IP, default: auto-detected)
 *       MARS_RELAY_PORT (default 8080), MARS_AGENT_PORT (default 4000)
 *       MARS_AGENT_TOKEN (default: random)
 *
 * Then start the mocks in another terminal:
 *   node dev/mockRelayServer.js
 *   node dev/mockAgentServer.js
 */
const os = require('os');
const crypto = require('crypto');

function lanIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

const host = process.env.MARS_HOST || lanIp();
const relayPort = process.env.MARS_RELAY_PORT || 8080;
const agentPort = process.env.MARS_AGENT_PORT || 40003;
const agentToken = process.env.MARS_AGENT_TOKEN || crypto.randomBytes(16).toString('hex');

const now = Date.now();
const payload = {
  version: 1,
  desktopId: 'dev-desktop-01',
  desktopName: 'DEV-STATION',
  pairingToken: crypto.randomBytes(16).toString('hex'),
  issuedAt: new Date(now).toISOString(),
  expiresAt: new Date(now + 10 * 60 * 1000).toISOString(),
  relayUrl: `ws://${host}:${relayPort}`,
  agentApiUrl: `http://${host}:${agentPort}`,
  agentApiToken: agentToken,
};

const json = JSON.stringify(payload);

console.log('\nPairing payload (valid 10 min):\n');
console.log(json);
console.log(`\nAgent token: ${agentToken}`);

try {
  const qrcode = require('qrcode-terminal');
  console.log('\nScan this with the app QR scanner:\n');
  qrcode.generate(json, { small: true });
} catch {
  console.log('\n(Install qrcode-terminal or paste the JSON into any QR generator.)');
}

console.log(
  `\nNote: use http://10.0.2.2:${agentPort} + ws://10.0.2.2:${relayPort} from an Android emulator.`
);
