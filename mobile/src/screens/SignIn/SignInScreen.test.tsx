import { act, renderHook } from '@testing-library/react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { AuthCancelledError, AuthSession } from '../../auth/types';
import { signInWithOAuthProvider } from '../../auth/oauthSignIn';

// The jest.fn()s are created inside their factories and pulled back out via the
// mocked modules. Referencing a `const` from a hoisted jest.mock factory would
// read it before initialisation, so the mocks would silently never apply.
jest.mock('../../auth/oauthSignIn', () => ({ signInWithOAuthProvider: jest.fn() }));
jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

const mockSupabaseAuth = {
  signOut: jest.fn(),
  getSession: jest.fn(),
  getUser: jest.fn(),
  signInWithIdToken: jest.fn(),
};

jest.mock('../../auth/supabaseClient', () => ({
  isSupabaseConfigured: () => true,
  requireSupabase: () => ({
    auth: {
      ...mockSupabaseAuth,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockApple = require('expo-apple-authentication');
const mockSignInWithOAuthProvider = signInWithOAuthProvider as jest.Mock;
const mockSignOut = mockSupabaseAuth.signOut;
const mockGetSession = mockSupabaseAuth.getSession;
const mockGetUser = mockSupabaseAuth.getUser;
const mockSignInWithIdToken = mockSupabaseAuth.signInWithIdToken;
const mockIsAvailableAsync = mockApple.isAvailableAsync as jest.Mock;

const user = {
  id: 'user-1',
  email: 'ada@example.com',
  email_confirmed_at: '2026-01-01T00:00:00Z',
  app_metadata: { provider: 'google' },
  user_metadata: { full_name: 'Ada', avatar_url: 'https://example.com/a.png' },
  identities: [{ provider: 'google' }],
};

const upstreamSession = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_at: Math.floor(Date.now() / 1000) + 900,
  user,
};

beforeEach(() => {
  useAuthStore.setState({ status: 'idle', session: null, error: null, loadingProvider: null });
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({ data: { session: upstreamSession }, error: null });
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
  mockSignOut.mockResolvedValue({ error: null });
  mockIsAvailableAsync.mockResolvedValue(true);
});

describe('sign-in', () => {
  it('runs the Supabase OAuth flow for Google', async () => {
    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(mockSignInWithOAuthProvider).toHaveBeenCalledWith('google');
    expect(result.current.status).toBe('authenticated');
    expect(result.current.loadingProvider).toBeNull();
  });

  it('runs the Supabase OAuth flow for GitHub', async () => {
    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signInWithGithub();
    });

    expect(mockSignInWithOAuthProvider).toHaveBeenCalledWith('github');
    expect(result.current.status).toBe('authenticated');
  });

  it('never puts a provider credential in the app session', async () => {
    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signInWithGoogle();
    });

    const projected = JSON.stringify(result.current.session);
    // The app holds Supabase's session only. Google/GitHub tokens stay on
    // Supabase's servers and are never persisted on the device.
    expect(projected).toContain('access-token');
    expect(projected).toContain('refresh-token');
    expect(projected).not.toContain('id_token');
    expect(projected).not.toContain('provider_token');
  });

  it('maps the upstream user onto the app shape', async () => {
    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(result.current.session?.user).toEqual({
      id: 'user-1',
      provider: 'google',
      email: 'ada@example.com',
      emailVerified: true,
      name: 'Ada',
      picture: 'https://example.com/a.png',
    });
    // expires_at is seconds; the app works in milliseconds.
    expect(result.current.session?.expiresAt).toBe(upstreamSession.expires_at * 1000);
  });

  it('resets to idle without an error when cancelled', async () => {
    mockSignInWithOAuthProvider.mockRejectedValue(new AuthCancelledError());

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.loadingProvider).toBeNull();
  });

  it('surfaces a genuine failure', async () => {
    mockSignInWithOAuthProvider.mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('network down');
  });

  it('surfaces a Supabase rejection message', async () => {
    mockSignInWithOAuthProvider.mockRejectedValue(
      Object.assign(new Error('redirect_uri_not_allowed'), { name: 'AuthApiError' })
    );

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(result.current.error).toBe('redirect_uri_not_allowed');
  });
});

describe('restoreSession', () => {
  it('goes idle without touching the network when nothing is stored', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.restoreSession();
    });

    expect(result.current.status).toBe('idle');
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('confirms a stored session against Supabase before trusting it', async () => {
    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.restoreSession();
    });

    expect(mockGetUser).toHaveBeenCalled();
    expect(result.current.status).toBe('authenticated');
    expect(result.current.session?.accessToken).toBe('access-token');
  });

  it('discards a stored session Supabase rejects', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: new Error('invalid JWT: unable to parse or verify signature'),
    });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.restoreSession();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.session).toBeNull();
  });

  it('never rejects, so the app cannot get stuck on the splash screen', async () => {
    // RootNavigator calls this with `void`; a rejection would leave status
    // stuck at 'restoring' with no way out.
    mockGetSession.mockRejectedValue(new Error('SecureStore key invalidated'));

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
  it('revokes the session on Supabase and clears local state', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      session: { user: user as unknown as AuthSession['user'], accessToken: 'a', refreshToken: 'r', expiresAt: Date.now() + 9e5 },
    });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(result.current.session).toBeNull();
    expect(result.current.status).toBe('idle');
  });

  it('still signs out locally when the network is down', async () => {
    mockSignOut.mockRejectedValue(new Error('Network request failed'));
    useAuthStore.setState({
      status: 'authenticated',
      session: { user: user as unknown as AuthSession['user'], accessToken: 'a', refreshToken: 'r', expiresAt: Date.now() + 9e5 },
    });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.session).toBeNull();
    expect(result.current.status).toBe('idle');
  });
});

describe('getAccessToken', () => {
  it('returns the token Supabase holds', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      session: { user: user as unknown as AuthSession['user'], accessToken: 'a', refreshToken: 'r', expiresAt: Date.now() + 9e5 },
    });

    const { result } = renderHook(() => useAuthStore());
    let token: string | null = null;
    await act(async () => {
      token = await result.current.getAccessToken();
    });

    expect(token).toBe('access-token');
  });

  it('ends the session when Supabase has no session left', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    useAuthStore.setState({
      status: 'authenticated',
      session: { user: user as unknown as AuthSession['user'], accessToken: 'a', refreshToken: 'r', expiresAt: Date.now() - 1000 },
    });

    const { result } = renderHook(() => useAuthStore());
    let token: string | null = 'unset';
    await act(async () => {
      token = await result.current.getAccessToken();
    });

    expect(token).toBeNull();
    expect(result.current.status).toBe('idle');
    expect(result.current.session).toBeNull();
  });

  it('ends the session when the refresh token is rejected', async () => {
    mockGetSession.mockRejectedValue(new Error('refresh_token_not_found'));
    useAuthStore.setState({
      status: 'authenticated',
      session: { user: user as unknown as AuthSession['user'], accessToken: 'a', refreshToken: 'r', expiresAt: Date.now() - 1000 },
    });

    const { result } = renderHook(() => useAuthStore());
    let token: string | null = 'unset';
    await act(async () => {
      token = await result.current.getAccessToken();
    });

    expect(token).toBeNull();
    expect(result.current.status).toBe('idle');
  });
});