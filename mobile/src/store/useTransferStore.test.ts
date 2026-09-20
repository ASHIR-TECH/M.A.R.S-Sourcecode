import { listSessions, listTransfers, listWatchers } from '../desktop/transferClient';
import { useTransferStore } from './useTransferStore';

jest.mock('../desktop/transferClient');

const connection = { baseUrl: 'https://desk.test', token: 'tok' };

describe('useTransferStore', () => {
  beforeEach(() => {
    useTransferStore.setState({ transfers: [], sessions: [], watchers: [], loading: false, lastError: null });
    jest.clearAllMocks();
  });

  it('refreshes transfers, sessions and watchers in parallel', async () => {
    (listTransfers as jest.Mock).mockResolvedValue([{ id: 't1', fileName: 'a.pdf' }]);
    (listSessions as jest.Mock).mockResolvedValue([{ id: 's1', peerId: 'P' }]);
    (listWatchers as jest.Mock).mockResolvedValue([{ path: '/inbox', active: true }]);

    await useTransferStore.getState().refresh(connection);

    expect(useTransferStore.getState().transfers).toHaveLength(1);
    expect(useTransferStore.getState().sessions).toHaveLength(1);
    expect(useTransferStore.getState().watchers).toHaveLength(1);
    expect(useTransferStore.getState().loading).toBe(false);
  });

  it('records the error and clears lists when a fetch fails', async () => {
    (listTransfers as jest.Mock).mockRejectedValue(new Error('boom'));

    await useTransferStore.getState().refresh(connection);

    expect(useTransferStore.getState().lastError).toBe('boom');
    expect(useTransferStore.getState().loading).toBe(false);
  });

  it('clears all state', () => {
    useTransferStore.setState({
      transfers: [{ id: 't', fileName: 'x' } as unknown as never],
      lastError: 'boom',
    });
    useTransferStore.getState().clear();
    expect(useTransferStore.getState().transfers).toEqual([]);
    expect(useTransferStore.getState().sessions).toEqual([]);
    expect(useTransferStore.getState().watchers).toEqual([]);
    expect(useTransferStore.getState().lastError).toBeNull();
  });
});