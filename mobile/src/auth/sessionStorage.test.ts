import * as SecureStore from 'expo-secure-store';
import { sessionStorage } from './sessionStorage';
import { AuthSession } from './types';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const stored: Record<string, string> = {};

beforeEach(() => {
  for (const key of Object.keys(stored)) delete stored[key];
  jest.clearAllMocks();
  (SecureStore.setItemAsync as jest.Mock).mockImplementation(async (key: string, value: string) => {
    stored[key] = value;
  });
  (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) => stored[key] ?? null);
  (SecureStore.deleteItemAsync as jest.Mock).mockImplementation(async (key: string) => {
    delete stored[key];
  });
});

function session(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    user: {
      id: 'user-1',
      provider: 'github',
      email: 'ada@example.com',
      emailVerified: true,
      name: 'Ada',
      picture: 'https://example.com/a.png',
    },
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresAt: Date.now() + 600_000,
    ...overrides,
  };
}

describe('round trip', () => {
  it('returns what was saved, so a restart does not force a re-auth', async () => {
    const original = session();
    await sessionStorage.save(original);

    const loaded = await sessionStorage.load();
    expect(loaded).toEqual(original);
  });

  it('never persists a provider credential, only the app session', async () => {
    await sessionStorage.save(session());
    const raw = Object.values(stored).join('');
    expect(raw).toContain('refresh-token');
    expect(raw).not.toMatch(/gho_|github_pat_|ya29\./);
  });

  it('stays a small payload (SecureStore encrypts the whole value)', async () => {
    await sessionStorage.save(session());
    const raw = Object.values(stored).join('');
    expect(raw.length).toBeLessThan(2048);
  });
});

describe('sign-out', () => {
  it('removes the stored session entirely', async () => {
    await sessionStorage.save(session());
    expect(await sessionStorage.load()).not.toBeNull();

    await sessionStorage.clear();

    expect(Object.keys(stored)).toHaveLength(0);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    expect(await sessionStorage.load()).toBeNull();
  });

  it('is safe to call twice', async () => {
    await sessionStorage.save(session());
    await sessionStorage.clear();
    await expect(sessionStorage.clear()).resolves.toBeUndefined();
  });

  it('completes even when the keystore refuses to delete', async () => {
    await sessionStorage.save(session());
    (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(new Error('KeyStore error'));

    await expect(sessionStorage.clear()).resolves.toBeUndefined();
  });
});

describe('hostile or corrupt storage', () => {
  it('returns null for a non-JSON payload', async () => {
    stored['mars.session'] = 'not json at all';
    expect(await sessionStorage.load()).toBeNull();
  });

  it('rejects a legacy provider-token session from an older build', async () => {
    stored['mars.session'] = JSON.stringify({ idToken: 'gho_legacy', provider: 'github' });
    expect(await sessionStorage.load()).toBeNull();
  });

  it.each([
    ['missing access token', { refreshToken: 'r', expiresAt: 1, user: { id: 'u' } }],
    ['missing refresh token', { accessToken: 'a', expiresAt: 1, user: { id: 'u' } }],
    ['missing expiry', { accessToken: 'a', refreshToken: 'r', user: { id: 'u' } }],
    ['missing user id', { accessToken: 'a', refreshToken: 'r', expiresAt: 1, user: {} }],
    ['empty access token', { accessToken: '', refreshToken: 'r', expiresAt: 1, user: { id: 'u' } }],
  ])('rejects a session with %s', async (_label, payload) => {
    stored['mars.session'] = JSON.stringify(payload);
    expect(await sessionStorage.load()).toBeNull();
  });
});

describe('keystore failures', () => {
  it('discards an undecryptable entry instead of throwing', async () => {
    // Happens when the Android keystore key is invalidated: lock screen
    // changed, biometrics re-enrolled, or the app was restored from backup.
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('Could not decrypt'));

    await expect(sessionStorage.load()).resolves.toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('mars.session');
  });

  it('does not throw when the entry is unreadable and cannot be deleted', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error('Could not decrypt'));
    (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(new Error('KeyStore error'));

    await expect(sessionStorage.load()).resolves.toBeNull();
  });

  it('does not break a valid sign-in when the write fails', async () => {
    (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(new Error('Value too large'));

    await expect(sessionStorage.save(session())).resolves.toBeUndefined();
  });
});
