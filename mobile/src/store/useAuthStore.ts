import { create } from 'zustand';
import { googleAuthProvider } from '../auth/googleAuthProvider';
import { githubAuthProvider } from '../auth/githubAuthProvider';
import { sessionStorage } from '../auth/sessionStorage';
import { AuthCancelledError, AuthResult, AuthProviderName } from '../auth/types';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error';

interface AuthState {
  status: AuthStatus;
  session: AuthResult | null;
  error: string | null;
  loadingProvider: AuthProviderName | null;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signOut: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

async function runSignIn(
  set: (partial: Partial<AuthState>) => void,
  provider: AuthProviderName,
  signInFn: () => Promise<AuthResult>
) {
  set({ status: 'loading', loadingProvider: provider, error: null });
  try {
    const result = await signInFn();
    await sessionStorage.save(result.idToken);
    set({ status: 'authenticated', session: result, error: null, loadingProvider: null });
  } catch (err) {
    if (err instanceof AuthCancelledError) {
      set({ status: 'idle', error: null, loadingProvider: null });
      return;
    }
    set({
      status: 'error',
      loadingProvider: null,
      error: err instanceof Error ? err.message : 'Sign-in failed. Please try again.',
    });
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  session: null,
  error: null,
  loadingProvider: null,

  signInWithGoogle: () => runSignIn(set, 'google', googleAuthProvider.signIn),
  signInWithGithub: () => runSignIn(set, 'github', githubAuthProvider.signIn),

  signOut: async () => {
    await sessionStorage.clear();
    set({ status: 'idle', session: null, error: null, loadingProvider: null });
  },

  restoreSession: async () => {
    const token = await sessionStorage.load();
    if (token) {
      set({ status: 'authenticated' });
    }
  },
}));
