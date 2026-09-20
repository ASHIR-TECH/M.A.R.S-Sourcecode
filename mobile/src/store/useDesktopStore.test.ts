import { desktopStorage } from '../desktop/desktopStorage';
import { useDesktopStore } from './useDesktopStore';

jest.mock('../desktop/desktopStorage', () => ({
  desktopStorage: { save: jest.fn(), load: jest.fn(), clear: jest.fn() },
}));

describe('useDesktopStore', () => {
  beforeEach(() => {
    useDesktopStore.setState({ connection: null, hydrated: false });
    jest.clearAllMocks();
  });

  it('saves a connection and reports it configured', async () => {
    (desktopStorage.save as jest.Mock).mockResolvedValue(undefined);

    await useDesktopStore.getState().saveConnection({ baseUrl: 'https://d', token: 't' });

    expect(desktopStorage.save).toHaveBeenCalledWith({ baseUrl: 'https://d', token: 't' });
    expect(useDesktopStore.getState().isConfigured()).toBe(true);
  });

  it('hydrates the stored connection', async () => {
    (desktopStorage.load as jest.Mock).mockResolvedValue({ baseUrl: 'https://d', token: 't' });

    await useDesktopStore.getState().hydrate();

    expect(useDesktopStore.getState().connection).toEqual({ baseUrl: 'https://d', token: 't' });
    expect(useDesktopStore.getState().hydrated).toBe(true);
  });

  it('clears the connection', async () => {
    (desktopStorage.clear as jest.Mock).mockResolvedValue(undefined);
    useDesktopStore.setState({ connection: { baseUrl: 'https://d', token: 't' } });

    await useDesktopStore.getState().clearConnection();

    expect(desktopStorage.clear).toHaveBeenCalled();
    expect(useDesktopStore.getState().isConfigured()).toBe(false);
  });
});
