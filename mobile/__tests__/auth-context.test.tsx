import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import * as SecureStore from 'expo-secure-store';

jest.mock('@/api/health', () => ({
  getHealth: jest.fn(),
  getReady: jest.fn(),
  checkReady: jest.fn(),
}));

jest.mock('@/api/auth', () => ({
  exchangeOAuthToken: jest.fn(),
}));

import { getHealth } from '@/api/health';
import { exchangeOAuthToken } from '@/api/auth';
import { invalidateCredentialsCache } from '@/api/storage';

// The manual mock (__mocks__/expo-secure-store.ts) exposes a store reset hook.
const resetStore = (SecureStore as unknown as { __resetStore: () => void }).__resetStore;

const mockGetHealth = getHealth as jest.MockedFunction<typeof getHealth>;
const mockExchange = exchangeOAuthToken as jest.MockedFunction<typeof exchangeOAuthToken>;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    resetStore();
    invalidateCredentialsCache();
    jest.clearAllMocks();
    mockGetHealth.mockResolvedValue({ status: 'ok' });
    mockExchange.mockResolvedValue({
      adtp_token: 'new-token',
      display_name: 'Ada Lovelace',
      email: 'ada@example.com',
    });
  });

  it('is unauthenticated when no session is stored and reports initialized', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.initialized).toBe(true));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.apiUrl).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  it('restores the session and profile from secure storage on app start', async () => {
    await SecureStore.setItemAsync('adtp_api_url', 'https://home:40003');
    await SecureStore.setItemAsync('adtp_api_token', 'stored-token');
    await SecureStore.setItemAsync(
      'mars_profile',
      JSON.stringify({
        display_name: 'Ada Lovelace',
        email: 'ada@example.com',
        provider: 'google',
      })
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.apiUrl).toBe('https://home:40003');
    expect(result.current.token).toBe('stored-token');
    expect(result.current.profile?.display_name).toBe('Ada Lovelace');
  });

  it('stores the ADTP token in secure storage after a successful OAuth exchange', async () => {
    await SecureStore.setItemAsync('adtp_api_url', 'https://home:40003');

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.initialized).toBe(true));

    await act(async () => {
      await result.current.exchangeOAuth('google', 'id-token-123');
    });

    expect(mockExchange).toHaveBeenCalledWith('google', 'id-token-123', 'https://home:40003');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe('new-token');
    expect(result.current.profile).toEqual({
      display_name: 'Ada Lovelace',
      email: 'ada@example.com',
      provider: 'google',
    });
    await expect(SecureStore.getItemAsync('adtp_api_token')).resolves.toBe('new-token');
    await expect(SecureStore.getItemAsync('mars_profile')).resolves.toBe(
      JSON.stringify({
        display_name: 'Ada Lovelace',
        email: 'ada@example.com',
        provider: 'google',
      })
    );
  });

  it('does not persist a session when the OAuth exchange fails', async () => {
    mockExchange.mockRejectedValue(new Error('Token verification failed'));
    await SecureStore.setItemAsync('adtp_api_url', 'https://home:40003');

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.initialized).toBe(true));

    await act(async () => {
      await expect(result.current.exchangeOAuth('apple', 'bad-id-token')).rejects.toThrow(
        'Token verification failed'
      );
    });

    expect(result.current.isAuthenticated).toBe(false);
    await expect(SecureStore.getItemAsync('adtp_api_token')).resolves.toBeNull();
  });

  it('validates and persists a new desktop API URL', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.initialized).toBe(true));

    await act(async () => {
      await result.current.saveApiUrl('https://new-peer:40003/');
    });

    expect(result.current.apiUrl).toBe('https://new-peer:40003');
    await expect(SecureStore.getItemAsync('adtp_api_url')).resolves.toBe('https://new-peer:40003');
  });

  it('clears credentials, profile and state on signOut', async () => {
    await SecureStore.setItemAsync('adtp_api_url', 'https://home:40003');
    await SecureStore.setItemAsync('adtp_api_token', 'stored-token');

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.profile).toBeNull();
    await expect(SecureStore.getItemAsync('adtp_api_token')).resolves.toBeNull();
    await expect(SecureStore.getItemAsync('adtp_api_url')).resolves.toBeNull();
  });
});
