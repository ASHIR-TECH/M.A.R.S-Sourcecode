import { act, renderHook } from '@testing-library/react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { AuthCancelledError } from '../../auth/types';

jest.mock('../../auth/googleAuthProvider', () => ({
  googleAuthProvider: { signIn: jest.fn() },
}));
jest.mock('../../auth/appleAuthProvider', () => ({
  appleAuthProvider: { signIn: jest.fn() },
}));
jest.mock('../../auth/sessionStorage', () => ({
  sessionStorage: { save: jest.fn(), load: jest.fn(), clear: jest.fn() },
}));

import { googleAuthProvider } from '../../auth/googleAuthProvider';

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
