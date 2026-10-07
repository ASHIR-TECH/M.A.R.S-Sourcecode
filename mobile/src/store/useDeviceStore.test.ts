import { useDeviceStore } from './useDeviceStore';
import { DeviceWithMetrics } from '../types/device';

const paired: DeviceWithMetrics = {
  id: 'DESK-1',
  name: 'Studio Rig',
  os: 'Desktop',
  status: 'online',
  lastSeen: 'Just Now',
  cpu: 0,
  ram: 0,
  collectionId: 'paired',
};

const relayNode: DeviceWithMetrics = {
  id: 'DEV-001',
  name: 'HOMELAB',
  os: 'Ubuntu Server',
  status: 'online',
  lastSeen: '2m ago',
  cpu: 26,
  ram: 48,
  collectionId: 'home-lab',
};

describe('useDeviceStore', () => {
  beforeEach(() => {
    useDeviceStore.setState({ devices: [], pairedDevice: null, searchQuery: '' });
  });

  it('starts a fresh install with no devices', () => {
    expect(useDeviceStore.getState().devices).toEqual([]);
    expect(useDeviceStore.getState().pairedDevice).toBeNull();
  });

  it('adds the paired desktop and shows it first', () => {
    useDeviceStore.getState().addPairedDevice(paired);

    const state = useDeviceStore.getState();
    expect(state.devices).toHaveLength(1);
    expect(state.devices[0].id).toBe('DESK-1');
    expect(state.pairedDevice).toEqual(paired);
  });

  it('does not duplicate the paired desktop when it is paired again', () => {
    useDeviceStore.getState().addPairedDevice(paired);
    useDeviceStore.getState().addPairedDevice({ ...paired, name: 'Renamed Rig' });

    expect(useDeviceStore.getState().devices).toHaveLength(1);
    expect(useDeviceStore.getState().devices[0].name).toBe('Renamed Rig');
  });

  it('replaces the list with the relay report', () => {
    useDeviceStore.getState().addPairedDevice(paired);
    useDeviceStore.getState().hydrateFromRelay([relayNode]);

    expect(useDeviceStore.getState().devices.map((d) => d.id)).toEqual(['DESK-1', 'DEV-001']);
  });

  it('keeps the paired desktop when the relay report omits it', () => {
    useDeviceStore.getState().addPairedDevice(paired);
    useDeviceStore.getState().hydrateFromRelay([]);

    expect(useDeviceStore.getState().devices.map((d) => d.id)).toEqual(['DESK-1']);
  });

  it('follows the relay list once it reports the paired desktop itself', () => {
    useDeviceStore.getState().addPairedDevice(paired);
    useDeviceStore.getState().hydrateFromRelay([{ ...relayNode, id: 'DESK-1' }, relayNode]);

    expect(useDeviceStore.getState().devices.map((d) => d.id)).toEqual(['DESK-1', 'DEV-001']);
  });

  it('removes the paired desktop and unpins it', () => {
    useDeviceStore.getState().addPairedDevice(paired);
    useDeviceStore.getState().removeDevice('DESK-1');

    const state = useDeviceStore.getState();
    expect(state.devices).toEqual([]);
    expect(state.pairedDevice).toBeNull();
  });

  it('drops the pinned copy when the paired device is removed through clear', () => {
    useDeviceStore.getState().addPairedDevice(paired);
    useDeviceStore.getState().removePairedDevice();

    expect(useDeviceStore.getState().devices).toEqual([]);
    expect(useDeviceStore.getState().pairedDevice).toBeNull();
  });

  it('keeps a rename on the pinned copy so the next relay report cannot undo it', () => {
    useDeviceStore.getState().addPairedDevice(paired);
    useDeviceStore.getState().renameDevice('DESK-1', { name: 'Studio Rig 2' });

    const state = useDeviceStore.getState();
    expect(state.devices[0].name).toBe('Studio Rig 2');
    expect(state.pairedDevice?.name).toBe('Studio Rig 2');
  });
});
