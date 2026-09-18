import { pairingStorage } from '../pairing/pairingStorage';
import { desktopStorage } from '../desktop/desktopStorage';
import { usePairingStore } from './usePairingStore';
import { PairingPayload } from '../pairing/types';

jest.mock('../pairing/pairingStorage', () => ({
  pairingStorage: { save: jest.fn(), load: jest.fn(), clear: jest.fn() },
}));

jest.mock('../desktop/desktopStorage', () => ({
  desktopStorage: { save: jest.fn(), load: jest.fn(), clear: jest.fn() },
}));

const basePayload: PairingPayload = {
  version: 1,
  desktopId: 'desktop-abc123',
  desktopName: 'ZEUS-MAIN-PC',
  pairingToken: 'tok_xyz',
  issuedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  relayUrl: 'wss://relay.example.com',
};

describe('usePairingStore', () => {
  beforeEach(() => {
    usePairingStore.setState({ pairedDesktop: null });
    jest.clearAllMocks();
  });

  it('auto-configures the desktop agent when the QR carries agent config', async () => {
    (pairingStorage.save as jest.Mock).mockResolvedValue(undefined);
    (desktopStorage.save as jest.Mock).mockResolvedValue(undefined);

    await usePairingStore.getState().setPairedDesktop({
      ...basePayload,
      agentApiUrl: 'https://192.168.1.20:40003',
      agentApiToken: 'adtp_tok',
    });

    expect(desktopStorage.save).toHaveBeenCalledWith({
      baseUrl: 'https://192.168.1.20:40003',
      token: 'adtp_tok',
      origin: 'qr',
    });
  });

  it('derives the agent connection from a relay-only QR', async () => {
    (pairingStorage.save as jest.Mock).mockResolvedValue(undefined);
    (desktopStorage.save as jest.Mock).mockResolvedValue(undefined);

    await usePairingStore.getState().setPairedDesktop(basePayload);

    expect(desktopStorage.save).toHaveBeenCalledWith({
      baseUrl: `https://${new URL(basePayload.relayUrl).hostname}:40003`,
      token: 'tok_xyz',
      origin: 'qr',
    });
  });

  it('clears the desktop agent when unpairing', async () => {
    (pairingStorage.clear as jest.Mock).mockResolvedValue(undefined);
    (desktopStorage.clear as jest.Mock).mockResolvedValue(undefined);

    await usePairingStore.getState().clearPairing();

    expect(desktopStorage.clear).toHaveBeenCalled();
  });
});
