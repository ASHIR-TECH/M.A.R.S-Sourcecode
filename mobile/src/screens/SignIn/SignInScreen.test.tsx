import { act, renderHook } from '@testing-library/react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { AuthCancelledError } from '../../auth/types';

jest.mock('../../auth/googleAuthProvider', () => ({
  googleAuthProvider: { signIn: jest.fn() },
}));
jest.mock('../../auth/githubAuthProvider', () => ({
  githubAuthProvider: { signIn: jest.fn() },
}));
jest.mock('../../auth/sessionStorage', () => ({
  sessionStorage: { save: jest.fn(), load: jest.fn(), clear: jest.fn() },
}));

import { googleAuthProvider } from '../../auth/googleAuthProvider';
import { githubAuthProvider } from '../../auth/githubAuthProvider';

describe('useAuthStore.signInWithGoogle', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'idle', session: null, error: null });
    jest.clearAllMocks();
  });

  it('sets status to authenticated on success', async () => {
    (googleAuthProvider.signIn as jest.Mock).mockResolvedValue({
      idToken: 'fake-token',
      provider: 'google',
    });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(result.current.status).toBe('authenticated');
    expect(result.current.session?.provider).toBe('google');
  });

  it('resets to idle without an error when cancelled', async () => {
    (googleAuthProvider.signIn as jest.Mock).mockRejectedValue(new AuthCancelledError());

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('sets an error message on genuine failure', async () => {
    (googleAuthProvider.signIn as jest.Mock).mockRejectedValue(new Error('network down'));

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('network down');
  });
});

describe('useAuthStore.signInWithGithub', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'idle', session: null, error: null });
    jest.clearAllMocks();
  });

  it('sets status to authenticated when the relay exchange succeeds', async () => {
    (githubAuthProvider.signIn as jest.Mock).mockResolvedValue({
      idToken: 'gho_fake_token',
      provider: 'github',
    });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signInWithGithub();
    });

    expect(result.current.status).toBe('authenticated');
    expect(result.current.session?.provider).toBe('github');
  });

  it('resets to idle without an error when the user cancels', async () => {
    (githubAuthProvider.signIn as jest.Mock).mockRejectedValue(new AuthCancelledError());

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signInWithGithub();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('surfaces a friendly message while the relay is not configured', async () => {
    (githubAuthProvider.signIn as jest.Mock).mockRejectedValue(
      new Error('GitHub sign-in is not configured yet.')
    );

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.signInWithGithub();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('GitHub sign-in is not configured yet.');
  });
});
