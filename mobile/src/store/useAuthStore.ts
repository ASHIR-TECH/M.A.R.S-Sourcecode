import { create } from 'zustand';
import { googleAuthProvider } from '../auth/googleAuthProvider';
import { githubAuthProvider } from '../auth/githubAuthProvider';
import { sessionStorage } from '../auth/sessionStorage';
import { AuthCancelledError, AuthResult } from '../auth/types';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error';

interface AuthState {
  status: AuthStatus;
  session: AuthResult | null;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signOut: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

async function runSignIn(
  set: (partial: Partial<AuthState>) => void,
  signInFn: () => Promise<AuthResult>
) {
  set({ status: 'loading', error: null });
  try {
    const result = await signInFn();
    await sessionStorage.save(result.idToken);
    set({ status: 'authenticated', session: result, error: null });
  } catch (err) {
    if (err instanceof AuthCancelledError) {
      set({ status: 'idle', error: null });
      return;
    }
    set({
      status: 'error',
      error: err instanceof Error ? err.message : 'Sign-in failed. Please try again.',
    });
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  session: null,
  error: null,

  signInWithGoogle: () => runSignIn(set, googleAuthProvider.signIn),
  signInWithGithub: () => runSignIn(set, githubAuthProvider.signIn),

  signOut: async () => {
    await sessionStorage.clear();
    set({ status: 'idle', session: null, error: null });
  },

  restoreSession: async () => {
    const token = await sessionStorage.load();
    if (token) {
      // Session presence implies authenticated; provider identity is not
      // recoverable from a stored token alone without a backend call —
      // that verification belongs to a later "session validation" phase.
      set({ status: 'authenticated' });
    }
  },
}));
