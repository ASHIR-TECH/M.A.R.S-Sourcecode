import { DesktopConnection } from '../desktop/types';
import { PairingPayload } from './types';

const AGENT_PORT = 40003;
const RELAY_PATTERN = /^(wss?):\/\/([^/:]+)/i;
const HTTP_PATTERN = /^(https?):\/\/([^/]+)/i;
const RELAY_PATH = '/relay';

/**
 * Resolves the Phase 14 desktop-agent REST endpoint from a pairing payload.
 *
 * Explicit fields win: when the QR carries `agentApiUrl` + `agentApiToken`
 * they are used verbatim. Otherwise we derive from the existing relay URL —
 * the desktop that printed the QR also hosts the FastAPI gateway on port
 * 40003 (`ADTP_API_PORT`), and its `pairingToken` doubles as the bearer token.
 * This keeps scanning a QR the single step to pair AND configure device control.
 */
export function deriveAgentConnection(payload: PairingPayload): DesktopConnection | null {
  if (payload.agentApiUrl && payload.agentApiToken) {
    return { baseUrl: payload.agentApiUrl, token: payload.agentApiToken, origin: 'qr' };
  }

  const match = RELAY_PATTERN.exec(payload.relayUrl);
  if (!match) return null;

  const scheme = match[1].toLowerCase() === 'wss' ? 'https' : 'http';
  const host = match[2];
  return {
    baseUrl: `${scheme}://${host}:${AGENT_PORT}`,
    token: payload.pairingToken,
    origin: 'qr',
  };
}

/**
 * The WebSocket the app's RelayClient should dial.
 *
 * The QR's `relayUrl` is the public QoWT relay (`wss://relay.ashir.world/adtp`)
 * — it forwards QUIC frames, not the MARS `authenticate`/`chat_message`
 * protocol, so connecting to it loops forever. The desktop's own gateway
 * serves `WS /relay` on the same host/port as `agentApiUrl`, which is what the
 * phone should reach on the LAN. Only if the QR has no agent URL do we fall
 * back to whatever it advertised.
 */
export function deriveRelayUrl(payload: PairingPayload): string {
  if (payload.agentApiUrl) {
    const match = HTTP_PATTERN.exec(payload.agentApiUrl.trim());
    if (match) {
      const scheme = match[1].toLowerCase() === 'https' ? 'wss' : 'ws';
      return `${scheme}://${match[2]}${RELAY_PATH}`;
    }
  }
  return payload.relayUrl;
}
