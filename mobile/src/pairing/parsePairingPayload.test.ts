import { parsePairingPayload, isPairingError } from './parsePairingPayload';

const validPayload = {
  version: 1,
  desktopId: 'desktop-abc123',
  desktopName: 'ZEUS-MAIN-PC',
  pairingToken: 'tok_xyz',
  issuedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  relayUrl: 'wss://relay.example.com',
};

describe('parsePairingPayload', () => {
  it('returns the payload for valid JSON matching the schema', () => {
    const result = parsePairingPayload(JSON.stringify(validPayload));
    expect(isPairingError(result)).toBe(false);
    if (!isPairingError(result)) {
      expect(result.desktopId).toBe('desktop-abc123');
      expect(result.relayUrl).toBe('wss://relay.example.com');
    }
  });

  it('returns a malformed error for invalid JSON', () => {
    const result = parsePairingPayload('not json');
    expect(isPairingError(result)).toBe(true);
    if (isPairingError(result)) expect(result.reason).toBe('malformed');
  });

  it('returns an invalid_schema error when a required field is missing', () => {
    const { pairingToken, ...incomplete } = validPayload;
    const result = parsePairingPayload(JSON.stringify(incomplete));
    expect(isPairingError(result)).toBe(true);
    if (isPairingError(result)) expect(result.reason).toBe('invalid_schema');
  });

  it('returns an invalid_schema error when a field has the wrong type', () => {
    const wrongType = { ...validPayload, desktopId: 42 };
    const result = parsePairingPayload(JSON.stringify(wrongType));
    expect(isPairingError(result)).toBe(true);
    if (isPairingError(result)) expect(result.reason).toBe('invalid_schema');
  });

  it('returns an expired error when expiresAt is in the past', () => {
    const expired = { ...validPayload, expiresAt: new Date(Date.now() - 1000).toISOString() };
    const result = parsePairingPayload(JSON.stringify(expired));
    expect(isPairingError(result)).toBe(true);
    if (isPairingError(result)) expect(result.reason).toBe('expired');
  });

  it('returns an expired error when expiresAt is not a valid date', () => {
    const invalid = { ...validPayload, expiresAt: 'not-a-date' };
    const result = parsePairingPayload(JSON.stringify(invalid));
    expect(isPairingError(result)).toBe(true);
    if (isPairingError(result)) expect(result.reason).toBe('expired');
  });

  it('returns an unsupported_version error for a future/unknown version', () => {
    const futureVersion = { ...validPayload, version: 2 };
    const result = parsePairingPayload(JSON.stringify(futureVersion));
    expect(isPairingError(result)).toBe(true);
    if (isPairingError(result)) expect(result.reason).toBe('unsupported_version');
  });
});