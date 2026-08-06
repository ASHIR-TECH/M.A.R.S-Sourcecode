import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { checkReady, getHealth, getReady } from '@/api/health';
import {
  clearCredentials,
  loadApiUrl,
  loadToken,
  saveCredentials,
} from '@/api/storage';
import { setUnauthorizedHandler } from '@/api/client';
import type { HealthStatus } from '@/api/types';

const BIOMETRIC_KEY = 'mars_biometric_enabled';

interface AuthContextValue {
  apiUrl: string | null;
  token: string | null;
  isAuthenticated: boolean;
  /** Last readiness probe result. `null` until first successful probe. */
  ready: boolean | null;
  /** Reachability / connection state. */
  online: boolean | null;
  connecting: boolean;
  error: string | null;
  health: HealthStatus | null;
  biometricEnabled: boolean;
  connect: (url: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshReady: () => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [apiUrl, setApiUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ready, setReady] = useState<boolean | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);

  const signOut = useCallback(async () => {
    await clearCredentials();
    setIsAuthenticated(false);
    setApiUrl(null);
    setToken(null);
    setReady(null);
    setOnline(null);
    setError(null);
  }, []);

  // Register the 401 handler once. Any 401 from the desktop peer signs the
  // user out; the root layout redirects to /setup because isAuthenticated drops.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  // On mount: restore credentials, probe reachability.
  useEffect(() => {
    let active = true;
    void (async () => {
      const storedUrl = await loadApiUrl();
      const storedToken = await loadToken();
      if (!active) return;
      if (storedUrl && storedToken) {
        setApiUrl(storedUrl);
        setToken(storedToken);
        setIsAuthenticated(true);
      }
      try {
        const enabled = await SecureStore.getItemAsync(BIOMETRIC_KEY);
        if (active) setBiometricEnabledState(enabled === '1');
      } catch {
        // ignore secure-store read failures
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const refreshReady = useCallback(async () => {
    try {
      const h = await getHealth();
      setHealth(h);
      setOnline(true);
      const r = await getReady();
      setReady(r.status === 'ok' || r.status === 'OK' || r.status === 'ready');
    } catch {
      setOnline(false);
      setReady(false);
    }
  }, []);

  // Probe reachability whenever credentials are restored.
  useEffect(() => {
    if (isAuthenticated) {
      void refreshReady();
    }
  }, [isAuthenticated, refreshReady]);

  const connect = useCallback(
    async (url: string, tokenValue: string) => {
      setConnecting(true);
      setError(null);
      try {
        // Validate before persisting so a bad update never wipes working
        // credentials: reachability (auth-exempt), then token validity.
        await getHealth(url);
        await checkReady(url, tokenValue);
        await saveCredentials(url, tokenValue);
        setApiUrl(url.trim().replace(/\/+$/, ''));
        setToken(tokenValue.trim());
        setIsAuthenticated(true);
        setOnline(true);
        setReady(true);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : 'Connection failed. Check the API URL and token.';
        setError(message);
        throw e;
      } finally {
        setConnecting(false);
      }
    },
    []
  );

  const setBiometricEnabled = useCallback(async (enabled: boolean) => {
    await SecureStore.setItemAsync(BIOMETRIC_KEY, enabled ? '1' : '0');
    setBiometricEnabledState(enabled);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      apiUrl,
      token,
      isAuthenticated,
      ready,
      online,
      connecting,
      error,
      health,
      biometricEnabled,
      connect,
      signOut,
      refreshReady,
      setBiometricEnabled,
    }),
    [
      apiUrl,
      token,
      isAuthenticated,
      ready,
      online,
      connecting,
      error,
      health,
      biometricEnabled,
      connect,
      signOut,
      refreshReady,
      setBiometricEnabled,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
