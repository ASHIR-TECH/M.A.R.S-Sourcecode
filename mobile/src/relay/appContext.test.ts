import { buildAppChatContext } from './appContext';
import { useDeviceStore } from '../store/useDeviceStore';
import { usePairingStore } from '../store/usePairingStore';
import { DeviceWithMetrics } from '../types/device';
import { PairingPayload } from '../pairing/types';

const pairedDesktop: PairingPayload = {
  version: 1,
  desktopId: 'DESK-1',
  desktopName: 'Studio Rig',
  pairingToken: 'tok',
  issuedAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2026-01-02T00:00:00.000Z',
  relayUrl: 'ws://localhost:8080',
};

const device: DeviceWithMetrics = {
  id: 'DEV-1',
  name: 'NODE-A',
  os: 'Linux',
  status: 'online',
  lastSeen: 'Just Now',
  cpu: 10,
  ram: 20,
  collectionId: 'c',
};

describe('buildAppChatContext', () => {
  afterEach(() => {
    useDeviceStore.setState({ devices: [] });
    usePairingStore.setState({ pairedDesktop: null });
  });

  it('reports no desktop and no devices when nothing is available', () => {
    useDeviceStore.setState({ devices: [] });
    usePairingStore.setState({ pairedDesktop: null });

    expect(buildAppChatContext()).toEqual({ pairedDesktop: null, devices: [] });
  });

  it('includes the paired desktop and device list with metrics', () => {
    usePairingStore.setState({ pairedDesktop });
    useDeviceStore.setState({ devices: [device] });

    expect(buildAppChatContext()).toEqual({
      pairedDesktop: { id: 'DESK-1', name: 'Studio Rig' },
      devices: [
        {
          id: 'DEV-1',
          name: 'NODE-A',
          os: 'Linux',
          status: 'online',
          lastSeen: 'Just Now',
          cpu: 10,
          ram: 20,
        },
      ],
    });
  });
});
