import { PairingPayload, PairingError } from './types';

function isPairingErrorFree(payload: any): payload is PairingPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    payload.version === 1 &&
    typeof payload.desktopId === 'string' &&
    typeof payload.desktopName === 'string' &&
    typeof payload.pairingToken === 'string' &&
    typeof payload.issuedAt === 'string' &&
    typeof payload.expiresAt === 'string' &&
    typeof payload.relayUrl === 'string'
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