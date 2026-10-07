import { secureStorageAdapter, SECURE_STORE_ENTRY_LIMIT } from './secureStoreAdapter';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const store = SecureStore as jest.Mocked<typeof SecureStore>;

beforeEach(() => jest.clearAllMocks());

describe('secureStoreAdapter', () => {
  it('round-trips a value through the keystore', async () => {
    store.setItemAsync.mockResolvedValue(undefined);
    store.getItemAsync.mockResolvedValue('value');

    await secureStorageAdapter.setItem('k', 'value');
    expect(store.setItemAsync).toHaveBeenCalledWith('k', 'value');
    await expect(secureStorageAdapter.getItem('k')).resolves.toBe('value');
  });

  it('returns null for a key that was never written', async () => {
    store.getItemAsync.mockResolvedValue(null);
    await expect(secureStorageAdapter.getItem('missing')).resolves.toBeNull();
  });

  it('discards an entry the keystore can no longer decrypt', async () => {
    // Lock-screen change, biometric reset, or a restore from backup onto a
    // different device all invalidate the key. That is not a crash: the entry is
    // unreadable garbage, so treat it as "no session".
    store.getItemAsync.mockRejectedValue(new Error('Could not decrypt'));
    store.deleteItemAsync.mockResolvedValue(undefined);

    await expect(secureStorageAdapter.getItem('k')).resolves.toBeNull();
    expect(store.deleteItemAsync).toHaveBeenCalledWith('k');
  });

  it('still resolves when the delete of a dead entry fails too', async () => {
    store.getItemAsync.mockRejectedValue(new Error('Could not decrypt'));
    store.deleteItemAsync.mockRejectedValue(new Error('KeyStore error'));

    await expect(secureStorageAdapter.getItem('k')).resolves.toBeNull();
  });

  it('never throws when a write fails', async () => {
    // A failed write must not break an otherwise valid sign-in; the session
    // simply will not survive a restart.
    store.setItemAsync.mockRejectedValue(new Error('quota exceeded'));
    await expect(secureStorageAdapter.setItem('k', 'v')).resolves.toBeUndefined();
  });

  it('never throws when a delete fails', async () => {
    store.deleteItemAsync.mockRejectedValue(new Error('KeyStore error'));
    await expect(secureStorageAdapter.removeItem('k')).resolves.toBeUndefined();
  });
  it('stores a large session (over 2048 bytes) by chunking it', async () => {
    const LargeSession = new Array(1000).fill('0').join('');
    const big = JSON.stringify({ a: LargeSession, b: LargeSession, c: LargeSession, d: LargeSession });
    expect(big.length).toBeGreaterThan(SECURE_STORE_ENTRY_LIMIT);
    const storage: Record<string, string | null> = {};
    store.setItemAsync.mockImplementation(async (key: any, value: any) => {
      storage[key as string] = value as string;
    });
    store.getItemAsync.mockImplementation(async (key: any) => {
      return storage[key as string] ?? null;
    });
    store.deleteItemAsync.mockImplementation(async (key: any) => {
      delete storage[key as string];
    });
    await secureStorageAdapter.setItem('sb-session', big);
    const read = await secureStorageAdapter.getItem('sb-session');
    expect(read).toBe(big);
  });});