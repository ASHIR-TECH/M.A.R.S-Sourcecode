import { pairingStorage } from '../pairing/pairingStorage';
import { desktopStorage } from '../desktop/desktopStorage';
import { usePairingStore } from './usePairingStore';
import { useDeviceStore } from './useDeviceStore';
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
    useDeviceStore.setState({ devices: [], pairedDevice: null, searchQuery: '' });
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

  it('shows the paired desktop in the device hub', async () => {
    (pairingStorage.save as jest.Mock).mockResolvedValue(undefined);
    (desktopStorage.save as jest.Mock).mockResolvedValue(undefined);

    await usePairingStore.getState().setPairedDesktop(basePayload);

    const devices = useDeviceStore.getState().devices;
    expect(devices).toHaveLength(1);
    expect(devices[0]).toMatchObject({ id: basePayload.desktopId, name: 'ZEUS-MAIN-PC' });
  });

  it('restores the paired desktop into the device hub after a restart', async () => {
    (pairingStorage.load as jest.Mock).mockResolvedValue(basePayload);

    await usePairingStore.getState().restorePairing();

    expect(useDeviceStore.getState().devices).toHaveLength(1);
    expect(useDeviceStore.getState().devices[0].id).toBe(basePayload.desktopId);
  });

  it('drops the paired desktop from the device hub when unpairing', async () => {
    (pairingStorage.save as jest.Mock).mockResolvedValue(undefined);
    (desktopStorage.save as jest.Mock).mockResolvedValue(undefined);
    (pairingStorage.clear as jest.Mock).mockResolvedValue(undefined);
    (desktopStorage.clear as jest.Mock).mockResolvedValue(undefined);

    await usePairingStore.getState().setPairedDesktop(basePayload);
    await usePairingStore.getState().clearPairing();

    expect(useDeviceStore.getState().devices).toEqual([]);
    expect(useDeviceStore.getState().pairedDevice).toBeNull();
  });
});
