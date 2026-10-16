import { buildAppChatContext } from './appContext';
import { useDeviceStore } from '../store/useDeviceStore';
import { usePairingStore } from '../store/usePairingStore';
import { useDesktopSystemStore } from '../store/useDesktopSystemStore';
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
    useDesktopSystemStore.setState({ info: null, updatedAt: null });
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

  it('includes live desktop telemetry when a system snapshot is cached', () => {
    usePairingStore.setState({ pairedDesktop });
    useDeviceStore.setState({ devices: [device] });
    useDesktopSystemStore.getState().setInfo({
      hostname: 'ZEUS',
      os: 'Linux',
      osVersion: '6.8.0',
      arch: 'x86_64',
      cpuPercent: 17.5,
      ramPercent: 48,
      ramTotal: 17_179_869_184,
      uptimeSeconds: 7200,
      primaryIp: '192.168.1.10',
      agentActive: true,
      agentModel: 'llama3',
    });

    const ctx = buildAppChatContext();
    expect(ctx.pairedDesktop).toMatchObject({
      id: 'DESK-1',
      name: 'ZEUS',
      os: 'Linux',
      osVersion: '6.8.0',
      arch: 'x86_64',
      cpuPercent: 17.5,
      ramPercent: 48,
      ramTotalGb: 16.0,
      uptimeHours: 2.0,
      ip: '192.168.1.10',
      agentActive: true,
      agentModel: 'llama3',
    });
  });
});
