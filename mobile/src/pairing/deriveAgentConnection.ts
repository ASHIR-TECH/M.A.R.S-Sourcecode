import { DesktopConnection } from '../desktop/types';
import { PairingPayload } from './types';

const AGENT_PORT = 40003;
const RELAY_PATTERN = /^(wss?):\/\/([^/:]+)/i;

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