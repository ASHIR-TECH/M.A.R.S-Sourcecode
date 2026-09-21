import { PairingPayload, PairingError } from './types';

const MAX_TEXT_LENGTH = 256;
const MAX_URL_LENGTH = 2048;
const MAX_TOKEN_LENGTH = 512;

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isShortString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

/**
 * Rejects schemes the app must never follow from a scanned QR. Without this a
 * hostile code could point `relayUrl` at `javascript:`/`file:`/`data:` or a
 * cleartext `http:` host, leaking the pairing token to an arbitrary server.
 */
function hasScheme(value: string, allowed: readonly string[]): boolean {
  if (value.length === 0 || value.length > MAX_URL_LENGTH) return false;
  try {
    const protocol = new URL(value).protocol.replace(/:$/, '').toLowerCase();
    return allowed.includes(protocol);
  } catch {
    return false;
  }
}

function isPairingErrorFree(payload: any): payload is PairingPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    payload.version === 1 &&
    isShortString(payload.desktopId, MAX_TEXT_LENGTH) &&
    isShortString(payload.desktopName, MAX_TEXT_LENGTH) &&
    isShortString(payload.pairingToken, MAX_TOKEN_LENGTH) &&
    typeof payload.issuedAt === 'string' &&
    typeof payload.expiresAt === 'string' &&
    isShortString(payload.relayUrl, MAX_URL_LENGTH) &&
    hasScheme(payload.relayUrl, ['ws', 'wss']) &&
    isOptionalString(payload.agentApiUrl) &&
    (payload.agentApiUrl === undefined || hasScheme(payload.agentApiUrl, ['http', 'https'])) &&
    isOptionalString(payload.agentApiToken) &&
    (payload.agentApiToken === undefined || isShortString(payload.agentApiToken, MAX_TOKEN_LENGTH))
  );
}

/**
 * Pure, side-effect-free QR payload parser (PHASE_5 §2.2). Never imports
 * React or camera code so it stays trivially unit-testable. The expiration
 * check is local-only (NFR-4) — Phase 6 adds the relay-backed verification.
 */
export function parsePairingPayload(raw: string): PairingPayload | PairingError {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { reason: 'malformed', message: 'This QR code is not a valid pairing code.' };
  }

  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'version' in parsed &&
    (parsed as any).version !== 1
  ) {
    return { reason: 'unsupported_version', message: 'This pairing code is from an unsupported app version.' };
  }

  if (!isPairingErrorFree(parsed)) {
    return { reason: 'invalid_schema', message: 'This QR code is missing required pairing information.' };
  }

  const expiresAt = new Date(parsed.expiresAt).getTime();
  if (Number.isNaN(expiresAt) || expiresAt < Date.now()) {
    return { reason: 'expired', message: 'This pairing code has expired. Generate a new one on your desktop.' };
  }

  return parsed;
}

export function isPairingError(value: PairingPayload | PairingError): value is PairingError {
  return 'reason' in value;
}
