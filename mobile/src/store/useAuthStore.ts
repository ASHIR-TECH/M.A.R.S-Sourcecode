import * as AppleAuthentication from 'expo-apple-authentication';
import { create } from 'zustand';
import { signInWithOAuthProvider } from '../auth/oauthSignIn';
import { toAuthSession } from '../auth/sessionMapper';
import { requireSupabase, isSupabaseConfigured } from '../auth/supabaseClient';
import { AuthCancelledError, AuthProviderName, AuthSession } from '../auth/types';

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
  /** Returns a valid access token, refreshed by Supabase if it has lapsed. */
  getAccessToken: () => Promise<string | null>;
}

function errorMessage(err: unknown): string {
  return err instanceof Error && err.message ? err.message : 'Sign-in failed. Please try again.';
}

/**
 * Keeps the store in step with Supabase without ever making an async Supabase
 * call from inside the listener: supabase-js holds an internal lock while
 * dispatching, so awaiting `getSession()` in there deadlocks the client. The
 * callback only reads the session it was handed and sets state synchronously.
 */
function publish(set: (partial: Partial<AuthState>) => void, session: AuthSession | null) {
  if (session) {
    set({ status: 'authenticated', session, error: null, loadingProvider: null });
  } else {
    set({ status: 'idle', session: null, error: null, loadingProvider: null });
  }
}

export const useAuthStore = create<AuthState>((set, get) => {
  let unsubscribe: (() => void) | null = null;

  function ensureSubscribed() {
    if (unsubscribe || !isSupabaseConfigured()) return;
    unsubscribe = requireSupabase()
      .auth.onAuthStateChange((_event, session) => {
        publish(set, session ? toAuthSession(session) : null);
      }).data.subscription.unsubscribe;
  }

  async function runSignIn(provider: AuthProviderName, flow: () => Promise<void>) {
    set({ status: 'loading', loadingProvider: provider, error: null });
    try {
      await flow();
      // The SIGNED_IN event drives the transition to 'authenticated'; reading
      // the session back covers providers that do not emit one.
      const { data } = await requireSupabase().auth.getSession();
      publish(set, data.session ? toAuthSession(data.session) : null);
    } catch (err) {
      if (err instanceof AuthCancelledError) {
        set({ status: 'idle', error: null, loadingProvider: null });
        return;
      }
      set({ status: 'error', loadingProvider: null, error: errorMessage(err) });
    }
  }

  /**
   * Apple keeps its native sign-in button (required by App Store review) and
   * hands the resulting identity token straight to Supabase, so the account
   * unifies with any other Apple-linked identity on the same project.
   */
  async function appleFlow() {
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) throw new Error('Apple sign-in is not available on this device.');

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('Apple did not return an identity token.');
    }

    await requireSupabase().auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
  }

  return {
    status: 'restoring',
    session: null,
    error: null,
    loadingProvider: null,

    signInWithGoogle: () => runSignIn('google', () => signInWithOAuthProvider('google')),

    signInWithGithub: () => runSignIn('github', () => signInWithOAuthProvider('github')),

    signInWithApple: () => runSignIn('apple', appleFlow),

    signOut: async () => {
      // Supabase revokes the refresh token server-side. Best effort: a network
      // failure must not trap the user on a screen they cannot leave.
      try {
        await requireSupabase().auth.signOut();
      } catch {
        // ignore
      }
      set({ status: 'idle', session: null, error: null, loadingProvider: null });
    },

    /**
     * Confirms a persisted session at startup.
     *
     * Supabase restores from the keystore itself, so this just surfaces the
     * result. It must never reject: the navigator waits on it, and an escaping
     * error would leave the app stuck on the splash screen forever.
     */
    restoreSession: async () => {
      try {
        if (!isSupabaseConfigured()) {
          set({ status: 'idle', session: null, error: null, loadingProvider: null });
          return;
        }

        ensureSubscribed();

        const { data, error } = await requireSupabase().auth.getSession();

        if (error) throw error;

        if (!data.session) {
          set({ status: 'idle', session: null, error: null, loadingProvider: null });
          return;
        }

        // Never trust the stored session on its own: ask Supabase whether the
        // user still exists and the token is still good.
        const { data: fresh, error: userError } = await requireSupabase().auth.getUser();
        if (userError) throw userError;

        publish(set, toAuthSession({ ...data.session, user: fresh.user }));
      } catch {
        // An undecryptable or revoked session is not worth surfacing; the user
        // simply signs in again.
        set({ status: 'idle', session: null, error: null, loadingProvider: null });
      }
    },

    getAccessToken: async () => {
      const current = get().session;
      if (!current) return null;

      try {
        // Supabase refreshes the token transparently when it is close to expiry.
        const { data, error } = await requireSupabase().auth.getSession();
        if (error) throw error;
        if (!data.session) {
          set({ status: 'idle', session: null, error: null, loadingProvider: null });
          return null;
        }
        const next = toAuthSession(data.session);
        set({ session: next });
        return next.accessToken;
      } catch {
        // The refresh token was revoked or the account deleted: end the session.
        set({ status: 'idle', session: null, error: null, loadingProvider: null });
        return null;
      }
    },
  };
});