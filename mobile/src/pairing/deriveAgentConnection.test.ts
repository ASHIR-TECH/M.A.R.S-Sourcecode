import { deriveAgentConnection } from './deriveAgentConnection';
import { PairingPayload } from './types';

const basePayload: PairingPayload = {
  version: 1,
  desktopId: 'desktop-abc123',
  desktopName: 'ZEUS-MAIN-PC',
  pairingToken: 'pairing_tok',
  issuedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  relayUrl: 'ws://192.168.0.3:8080',
};

describe('deriveAgentConnection', () => {
  it('prefers explicit agent fields in the QR', () => {
    const withAgent = {
      ...basePayload,
      agentApiUrl: 'https://station.example.com:9443',
      agentApiToken: 'custom_tok',
    };

    expect(deriveAgentConnection(withAgent)).toEqual({
      baseUrl: 'https://station.example.com:9443',
      token: 'custom_tok',
      origin: 'qr',
    });
  });

  it('derives http://<relay-host>:40003 + pairing token from a ws relay', () => {
    expect(deriveAgentConnection(basePayload)).toEqual({
      baseUrl: 'http://192.168.0.3:40003',
      token: 'pairing_tok',
      origin: 'qr',
    });
  });

  it('derives https for a wss relay and ignores the relay port', () => {
    expect(deriveAgentConnection({ ...basePayload, relayUrl: 'wss://station.example.com' })).toEqual({
      baseUrl: 'https://station.example.com:40003',
      token: 'pairing_tok',
      origin: 'qr',
    });
  });

  it('derives from a host-only relay URL', () => {
    expect(deriveAgentConnection({ ...basePayload, relayUrl: 'ws://10.0.2.2:8080' })).toEqual({
      baseUrl: 'http://10.0.2.2:40003',
      token: 'pairing_tok',
      origin: 'qr',
    });
  });

  it('returns null for a malformed relay URL', () => {
    expect(deriveAgentConnection({ ...basePayload, relayUrl: 'not a url' })).toBeNull();
  });
});