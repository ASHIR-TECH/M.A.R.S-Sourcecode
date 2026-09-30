import { act, renderHook } from '@testing-library/react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { AuthCancelledError, AuthSession, AuthUser } from '../../auth/types';

jest.mock('../../auth/googleAuthProvider', () => ({
  googleAuthProvider: { signIn: jest.fn() },
}));
jest.mock('../../auth/githubAuthProvider', () => ({
  githubAuthProvider: { signIn: jest.fn() },
}));
jest.mock('../../auth/appleAuthProvider', () => ({
  appleAuthProvider: { signIn: jest.fn() },
}));
jest.mock('../../auth/sessionStorage', () => ({
  sessionStorage: { save: jest.fn(), load: jest.fn(), clear: jest.fn() },
}));
jest.mock('../../auth/authClient', () => ({
  authClient: { signIn: jest.fn(), refresh: jest.fn(), logout: jest.fn(), me: jest.fn() },
}));

import { authClient } from '../../auth/authClient';
import { sessionStorage } from '../../auth/sessionStorage';
import { githubAuthProvider } from '../../auth/githubAuthProvider';
import { googleAuthProvider } from '../../auth/googleAuthProvider';

const user: AuthUser = {
  id: 'user-1',
  provider: 'google',
  email: 'ada@example.com',
  emailVerified: true,
  name: 'Ada',
  picture: 'https://example.com/a.png',
};

function serverSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    user,
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresAt: Date.now() + 600_000,
    ...overrides,
  };
}

beforeEach(() => {
  useAuthStore.setState({ status: 'idle', session: null, error: null, loadingProvider: null });
  jest.clearAllMocks();
  (sessionStorage.load as jest.Mock).mockResolvedValue(null);
  // clearAllMocks resets calls but not implementations, so restore defaults
  // explicitly; otherwise one test's rejection leaks into the next.
  (sessionStorage.save as jest.Mock).mockResolvedValue(undefined);
  (sessionStorage.clear as jest.Mock).mockResolvedValue(undefined);
  (authClient.signIn as jest.Mock).mockResolvedValue(serverSession());
  (authClient.refresh as jest.Mock).mockResolvedValue(serverSession());
  (authClient.logout as jest.Mock).mockResolvedValue(undefined);
  (authClient.me as jest.Mock).mockResolvedValue(user);
});

describe('sign-in', () => {
  it('exchanges the provider grant for a server session', async () => {
    (googleAuthProvider.signIn as jest.Mock).mockResolvedValue({
      provider: 'google',
      code: 'auth-code',
      codeVerifier: 'verifier',
      redirectUri: 'exp://127.0.0.1:8081/--/auth',
      nonce: 'nonce-1',
    });
    const session = serverSession();
    (authClient.signIn as jest.Mock).mockResolvedValue(session);

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(authClient.signIn).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google', code: 'auth-code', codeVerifier: 'verifier' })
    );
    expect(result.current.status).toBe('authenticated');
    expect(result.current.session?.user.provider).toBe('google');
    expect(result.current.loadingProvider).toBeNull();
  });

  it('persists the app session rather than the provider credential', async () => {
    (githubAuthProvider.signIn as jest.Mock).mockResolvedValue({
      provider: 'github',
      code: 'gh-code',
      redirectUri: 'exp://127.0.0.1:8081/--/auth',
    });
    const session = serverSession({ user: { ...user, provider: 'github' } });
    (authClient.signIn as jest.Mock).mockResolvedValue(session);

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signInWithGithub();
    });

    expect(sessionStorage.save).toHaveBeenCalledWith(session);
    const persisted = JSON.stringify((sessionStorage.save as jest.Mock).mock.calls[0][0]);
    expect(persisted).toContain('refresh-token');
    expect(persisted).not.toContain('gh-code');
  });

  it('resets to idle without an error when cancelled', async () => {
    (googleAuthProvider.signIn as jest.Mock).mockRejectedValue(new AuthCancelledError());

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.loadingProvider).toBeNull();
    expect(authClient.signIn).not.toHaveBeenCalled();
  });

  it('surfaces a genuine failure', async () => {
    (googleAuthProvider.signIn as jest.Mock).mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('network down');
  });

  it('surfaces a server rejection message', async () => {
    (googleAuthProvider.signIn as jest.Mock).mockResolvedValue({ provider: 'google', code: 'x', redirectUri: 'y' });
    const error = Object.assign(new Error('That redirect URI is not allowed for this server.'), {
      name: 'AuthApiError',
    });
    (authClient.signIn as jest.Mock).mockRejectedValue(error);

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(result.current.error).toBe('That redirect URI is not allowed for this server.');
  });
});

describe('restoreSession', () => {
  it('goes idle without touching the network when nothing is stored', async () => {
    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.restoreSession();
    });

    expect(result.current.status).toBe('idle');
    expect(authClient.me).not.toHaveBeenCalled();
  });

  it('confirms a stored session against the server before trusting it', async () => {
    const stored = serverSession();
    (sessionStorage.load as jest.Mock).mockResolvedValue(stored);
    (authClient.me as jest.Mock).mockResolvedValue(user);

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.restoreSession();
    });

    expect(authClient.me).toHaveBeenCalledWith('access-token');
    expect(result.current.status).toBe('authenticated');
  });

  it('refreshes first when the access token has expired', async () => {
    const stored = serverSession({ expiresAt: Date.now() - 1_000 });
    const refreshed = serverSession({ accessToken: 'fresh-access', refreshToken: 'fresh-refresh' });
    (sessionStorage.load as jest.Mock).mockResolvedValue(stored);
    (authClient.refresh as jest.Mock).mockResolvedValue(refreshed);
    (authClient.me as jest.Mock).mockResolvedValue(user);

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.restoreSession();
    });

    expect(authClient.refresh).toHaveBeenCalledWith('refresh-token');
    expect(authClient.me).toHaveBeenCalledWith('fresh-access');
    expect(result.current.session?.accessToken).toBe('fresh-access');
    expect(sessionStorage.save).toHaveBeenCalled();
  });

  it('discards a stored session the server rejects', async () => {
    (sessionStorage.load as jest.Mock).mockResolvedValue(serverSession());
    (authClient.me as jest.Mock).mockRejectedValue(new Error('Your session is invalid or has expired.'));

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.restoreSession();
    });

    expect(sessionStorage.clear).toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
    expect(result.current.session).toBeNull();
  });

  it('discards a stored session whose refresh token is dead', async () => {
    (sessionStorage.load as jest.Mock).mockResolvedValue(serverSession({ expiresAt: Date.now() - 1_000 }));
    (authClient.refresh as jest.Mock).mockRejectedValue(new Error('That session is no longer active.'));

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.restoreSession();
    });

    expect(sessionStorage.clear).toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('never rejects, so the app cannot get stuck on the splash screen', async () => {
    // SecureStore itself can throw when the Android keystore key is
    // invalidated; RootNavigator calls this with `void`, so a rejection here
    // would leave status stuck at 'restoring' with no way out.
    (sessionStorage.load as jest.Mock).mockRejectedValue(new Error('Could not decrypt'));
    (sessionStorage.clear as jest.Mock).mockRejectedValue(new Error('KeyStore error'));

    const { result } = renderHook(() => useAuthStore());
    let rejected = false;
    await act(async () => {
      try {
        await result.current.restoreSession();
      } catch {
        rejected = true;
      }
    });

    expect(rejected).toBe(false);
    expect(result.current.status).not.toBe('restoring');
    expect(result.current.status).toBe('idle');
  });
});

describe('signOut', () => {
  it('revokes the session on the server and clears local storage', async () => {
    (authClient.logout as jest.Mock).mockResolvedValue(undefined);
    useAuthStore.setState({ status: 'authenticated', session: serverSession() });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signOut();
    });

    expect(authClient.logout).toHaveBeenCalledWith('refresh-token');
    expect(sessionStorage.clear).toHaveBeenCalled();
    expect(result.current.session).toBeNull();
    expect(result.current.status).toBe('idle');
  });

  it('still signs out locally when the server is unreachable', async () => {
    (authClient.logout as jest.Mock).mockRejectedValue(new Error('Network request failed'));
    useAuthStore.setState({ status: 'authenticated', session: serverSession() });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signOut();
    });

    expect(sessionStorage.clear).toHaveBeenCalled();
    expect(result.current.session).toBeNull();
  });
});

describe('getAccessToken', () => {
  it('returns the existing token while it is still fresh', async () => {
    useAuthStore.setState({ status: 'authenticated', session: serverSession() });

    const { result } = renderHook(() => useAuthStore());
    let token: string | null = null;
    await act(async () => {
      token = await result.current.getAccessToken();
    });

    expect(token).toBe('access-token');
    expect(authClient.refresh).not.toHaveBeenCalled();
  });

  it('rotates before handing out a token when the session has lapsed', async () => {
    const refreshed = serverSession({ accessToken: 'fresh-access', refreshToken: 'fresh-refresh' });
    (authClient.refresh as jest.Mock).mockResolvedValue(refreshed);
    useAuthStore.setState({ status: 'authenticated', session: serverSession({ expiresAt: Date.now() - 1_000 }) });

    const { result } = renderHook(() => useAuthStore());
    let token: string | null = null;
    await act(async () => {
      token = await result.current.getAccessToken();
    });

    expect(token).toBe('fresh-access');
    expect(sessionStorage.save).toHaveBeenCalledWith(refreshed);
  });

  it('ends the session when the refresh token is rejected', async () => {
    (authClient.refresh as jest.Mock).mockRejectedValue(new Error('That session is not recognised.'));
    useAuthStore.setState({ status: 'authenticated', session: serverSession({ expiresAt: Date.now() - 1_000 }) });

    const { result } = renderHook(() => useAuthStore());
    let token: string | null = null;
    await act(async () => {
      token = await result.current.getAccessToken();
    });

    expect(token).toBeNull();
    expect(sessionStorage.clear).toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
  });

  it('returns null when there is no session at all', async () => {
    const { result } = renderHook(() => useAuthStore());
    let token: string | null = 'unset';
    await act(async () => {
      token = await result.current.getAccessToken();
    });

    expect(token).toBeNull();
  });
});
