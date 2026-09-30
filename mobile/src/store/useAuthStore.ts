import { create } from 'zustand';
import { authClient } from '../auth/authClient';
import { appleAuthProvider } from '../auth/appleAuthProvider';
import { githubAuthProvider } from '../auth/githubAuthProvider';
import { googleAuthProvider } from '../auth/googleAuthProvider';
import { sessionStorage } from '../auth/sessionStorage';
import { AuthCancelledError, AuthProviderName, AuthSession, isSessionExpired, OAuthGrant } from '../auth/types';

type AuthStatus = 'restoring' | 'idle' | 'loading' | 'authenticated' | 'error';

interface AuthState {
  status: AuthStatus;
  session: AuthSession | null;
  error: string | null;
  loadingProvider: AuthProviderName | null;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  restoreSession: () => Promise<void>;
  /** Returns a valid access token, refreshing it first if it has expired. */
  getAccessToken: () => Promise<string | null>;
}

function errorMessage(err: unknown): string {
  return err instanceof Error && err.message ? err.message : 'Sign-in failed. Please try again.';
}

export const useAuthStore = create<AuthState>((set, get) => {
  async function runSignIn(provider: AuthProviderName, collectGrant: () => Promise<OAuthGrant>) {
    set({ status: 'loading', loadingProvider: provider, error: null });
    try {
      const grant = await collectGrant();
      // The server verifies the provider credential; the app only ever holds
      // the resulting app session.
      const session = await authClient.signIn(grant);
      await sessionStorage.save(session);
      set({ status: 'authenticated', session, error: null, loadingProvider: null });
    } catch (err) {
      if (err instanceof AuthCancelledError) {
        set({ status: 'idle', error: null, loadingProvider: null });
        return;
      }
      set({ status: 'error', loadingProvider: null, error: errorMessage(err) });
    }
  }

  /**
   * Ends the session locally. Swallows storage failures on purpose: this runs
   * from error paths that must still resolve, and a keystore that refuses to
   * delete is no reason to leave a stale session in memory.
   */
  async function dropSession() {
    try {
      await sessionStorage.clear();
    } catch {
      // ignore
    }
    set({ status: 'idle', session: null, error: null, loadingProvider: null });
  }

  return {
    status: 'restoring',
    session: null,
    error: null,
    loadingProvider: null,

    signInWithGoogle: () => runSignIn('google', googleAuthProvider.signIn),
    signInWithGithub: () => runSignIn('github', githubAuthProvider.signIn),
    signInWithApple: () => runSignIn('apple', appleAuthProvider.signIn),

    signOut: async () => {
      const current = get().session;
      if (current) {
        // Best effort: revoke server-side, but never trap the user on a
        // network failure.
        try {
          await authClient.logout(current.refreshToken);
        } catch {
          // ignore
        }
      }
      await dropSession();
    },

    /**
     * A stored session is treated as a claim, not as proof. It is refreshed if
     * the access token has lapsed, then confirmed against GET /auth/me, and
     * only then promoted to "authenticated".
     *
     * This must never reject: the navigator waits on it, and an escaping
     * error would leave the app stuck on the splash screen forever.
     */
    restoreSession: async () => {
      try {
        const stored = await sessionStorage.load();
        if (!stored) {
          set({ status: 'idle', session: null, error: null, loadingProvider: null });
          return;
        }

        const session = isSessionExpired(stored) ? await authClient.refresh(stored.refreshToken) : stored;
        const user = await authClient.me(session.accessToken);
        const validated: AuthSession = { ...session, user };

        if (validated !== stored) await sessionStorage.save(validated);
        set({ status: 'authenticated', session: validated, error: null, loadingProvider: null });
      } catch {
        await dropSession();
      }
    },

    getAccessToken: async () => {
      const current = get().session;
      if (!current) return null;
      if (!isSessionExpired(current)) return current.accessToken;

      try {
        const refreshed = await authClient.refresh(current.refreshToken);
        await sessionStorage.save(refreshed);
        set({ session: refreshed, status: 'authenticated' });
        return refreshed.accessToken;
      } catch {
        // The refresh token is spent or was revoked: end the session.
        await dropSession();
        return null;
      }
    },
  };
});
