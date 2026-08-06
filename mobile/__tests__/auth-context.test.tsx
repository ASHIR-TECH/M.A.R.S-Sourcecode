import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import * as SecureStore from 'expo-secure-store';

jest.mock('@/api/health', () => ({
  getHealth: jest.fn(),
  getReady: jest.fn(),
  checkReady: jest.fn(),
}));

import { checkReady, getHealth, getReady } from '@/api/health';
import { invalidateCredentialsCache } from '@/api/storage';

// The manual mock (__mocks__/expo-secure-store.ts) exposes a store reset hook.
const resetStore = (SecureStore as unknown as { __resetStore: () => void }).__resetStore;

const mockGetHealth = getHealth as jest.MockedFunction<typeof getHealth>;
const mockGetReady = getReady as jest.MockedFunction<typeof getReady>;
const mockCheckReady = checkReady as jest.MockedFunction<typeof checkReady>;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    resetStore();
    invalidateCredentialsCache();
    jest.clearAllMocks();
    mockGetHealth.mockResolvedValue({ status: 'ok' });
    mockGetReady.mockResolvedValue({ status: 'ok' });
    mockCheckReady.mockResolvedValue({ status: 'ok' });
  });

  it('is unauthenticated when no credentials are stored', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(false));
    expect(result.current.apiUrl).toBeNull();
    expect(result.current.token).toBeNull();
  });

  it('restores credentials from secure storage on app start', async () => {
    await SecureStore.setItemAsync('adtp_api_url', 'http://home:40003');
    await SecureStore.setItemAsync('adtp_api_token', 'stored-token');

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.apiUrl).toBe('http://home:40003');
    expect(result.current.token).toBe('stored-token');
  });

  it('writes credentials to secure storage on connect', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.connect('http://home:40003/', ' new-token ');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.apiUrl).toBe('http://home:40003');
    expect(result.current.token).toBe('new-token');
    await expect(SecureStore.getItemAsync('adtp_api_url')).resolves.toBe('http://home:40003');
    await expect(SecureStore.getItemAsync('adtp_api_token')).resolves.toBe('new-token');
  });

  it('keeps existing credentials when a connect attempt fails', async () => {
    await SecureStore.setItemAsync('adtp_api_url', 'http://home:40003');
    await SecureStore.setItemAsync('adtp_api_token', 'good-token');
    mockCheckReady.mockRejectedValue(new Error('Token invalid'));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await expect(
        result.current.connect('http://home:40003', 'bad-token')
      ).rejects.toThrow('Token invalid');
    });

    // Still authenticated with the original token.
    expect(result.current.isAuthenticated).toBe(true);
    await expect(SecureStore.getItemAsync('adtp_api_token')).resolves.toBe('good-token');
  });

  it('clears credentials and state on signOut', async () => {
    await SecureStore.setItemAsync('adtp_api_url', 'http://home:40003');
    await SecureStore.setItemAsync('adtp_api_token', 'stored-token');

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.isAuthenticated).toBe(false);
    await expect(SecureStore.getItemAsync('adtp_api_token')).resolves.toBeNull();
    await expect(SecureStore.getItemAsync('adtp_api_url')).resolves.toBeNull();
  });
});
