import { signInWithOAuthProvider, oauthRedirectUri } from './oauthSignIn';
import * as WebBrowser from 'expo-web-browser';

const mockSetSession = jest.fn();
const mockExchange = jest.fn();
const mockSignInWithOAuth = jest.fn();

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: () => 'mars://auth',
}));

jest.mock('./supabaseClient', () => ({
  requireSupabase: () => ({
    auth: {
      setSession: mockSetSession,
      exchangeCodeForSession: mockExchange,
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

const browser = WebBrowser as jest.Mocked<typeof WebBrowser>;

beforeEach(() => {
  jest.clearAllMocks();
  mockSetSession.mockResolvedValue({ error: null });
  mockExchange.mockResolvedValue({ error: null });
  mockSignInWithOAuth.mockResolvedValue({ data: { url: 'https://provider/authorize' }, error: null });
  browser.openAuthSessionAsync.mockResolvedValue({
    type: 'success',
    url: 'mars://auth#access_token=at&refresh_token=rt',
  } as never);
});

function returning(url: string) {
  browser.openAuthSessionAsync.mockResolvedValue({ type: 'success', url } as never);
}

describe('signInWithOAuthProvider', () => {
  it('targets the mars://auth deep link', () => {
    expect(oauthRedirectUri()).toBe('mars://auth');
  });

  it('opens the provider in the system browser with browser redirects suppressed', async () => {
    await signInWithOAuthProvider('google');

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'mars://auth', skipBrowserRedirect: true },
    });
    expect(browser.openAuthSessionAsync).toHaveBeenCalledWith(
      'https://provider/authorize',
      'mars://auth'
    );
  });

  it('accepts tokens delivered in the URL fragment', async () => {
    // This is what Supabase actually sends back on the implicit path: the
    // tokens are in the fragment, which a query-string-only parser misses.
    returning('mars://auth#access_token=at-1&refresh_token=rt-1&token_type=bearer');

    await signInWithOAuthProvider('google');

    expect(mockSetSession).toHaveBeenCalledWith({ access_token: 'at-1', refresh_token: 'rt-1' });
  });

  it('accepts a PKCE code delivered in the query string', async () => {
    returning('mars://auth?code=the-code');

    await signInWithOAuthProvider('google');

    expect(mockExchange).toHaveBeenCalledWith('the-code');
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('url-decodes a token value that contains reserved characters', async () => {
    returning('mars://auth#access_token=a%2Bb%2Fc%3D&refresh_token=r%2Fd');

    await signInWithOAuthProvider('google');

    expect(mockSetSession).toHaveBeenCalledWith({ access_token: 'a+b/c=', refresh_token: 'r/d' });
  });

  it('surfaces a refusal the provider encoded into the redirect', async () => {
    returning('mars://auth#error=access_denied&error_description=User%20cancelled%20the%20request');

    await expect(signInWithOAuthProvider('google')).rejects.toThrow('User cancelled the request');
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('rejects a redirect that carries neither a code nor tokens', async () => {
    returning('mars://auth?some=thing');
    await expect(signInWithOAuthProvider('google')).rejects.toThrow(/did not return a usable session/);
  });

  it('rejects when supabase-js cannot start the flow', async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: null, error: new Error('Provider is disabled') });
    await expect(signInWithOAuthProvider('google')).rejects.toThrow('Provider is disabled');
  });

  it('propagates a failed token exchange', async () => {
    returning('mars://auth#access_token=at&refresh_token=rt');
    mockSetSession.mockResolvedValue({ error: new Error('Invalid Refresh Token') });

    await expect(signInWithOAuthProvider('google')).rejects.toThrow('Invalid Refresh Token');
  });

  it('treats a closed browser as a cancellation, not a failure', async () => {
    browser.openAuthSessionAsync.mockResolvedValue({ type: 'cancel' } as never);
    await expect(signInWithOAuthProvider('google')).rejects.toThrow(/cancelled/i);
  });

  it('treats a dismissed browser as a cancellation', async () => {
    browser.openAuthSessionAsync.mockResolvedValue({ type: 'dismiss' } as never);
    await expect(signInWithOAuthProvider('google')).rejects.toThrow(/cancelled/i);
  });
});