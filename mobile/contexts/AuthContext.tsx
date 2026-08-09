import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { exchangeOAuthToken } from '@/api/auth';
import { getHealth, getReady } from '@/api/health';
import {
  clearCredentials,
  loadApiUrl,
  loadProfile,
  loadToken,
  saveCredentials,
  saveProfile,
} from '@/api/storage';
import { setUnauthorizedHandler } from '@/api/client';
import type { HealthStatus, OAuthProvider, UserProfile } from '@/api/types';

const BIOMETRIC_KEY = 'mars_biometric_enabled';

interface AuthContextValue {
  apiUrl: string | null;
  token: string | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  /** True once the persisted session has been restored on app start. */
  initialized: boolean;
  /** Last readiness probe result. `null` until first successful probe. */
  ready: boolean | null;
  /** Reachability / connection state. */
  online: boolean | null;
  connecting: boolean;
  error: string | null;
  health: HealthStatus | null;
  biometricEnabled: boolean;
  /** Exchange an OAuth id_token for the ADTP API token and sign in. */
  exchangeOAuth: (provider: OAuthProvider, idToken: string) => Promise<void>;
  /** Persist a new desktop API URL after validating reachability. */
  saveApiUrl: (url: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshReady: () => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [apiUrl, setApiUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialized, setInitialized] = useState(false);
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
    setProfile(null);
    setReady(null);
    setOnline(null);
    setError(null);
  }, []);

  // Register the 401 handler once. Any 401 from the desktop peer signs the
  // user out; the root layout redirects to /login because isAuthenticated drops.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  // On mount: restore credentials and profile, probe reachability.
  useEffect(() => {
    let active = true;
    void (async () => {
      const storedUrl = await loadApiUrl();
      const storedToken = await loadToken();
      const storedProfile = await loadProfile();
      if (!active) return;
      if (storedUrl && storedToken) {
        setApiUrl(storedUrl);
        setToken(storedToken);
        setProfile(storedProfile);
        setIsAuthenticated(true);
      }
      try {
        const enabled = await SecureStore.getItemAsync(BIOMETRIC_KEY);
        if (active) setBiometricEnabledState(enabled === '1');
      } catch {
        // ignore secure-store read failures
      }
      if (active) setInitialized(true);
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

  const exchangeOAuth = useCallback(
    async (provider: OAuthProvider, idToken: string) => {
      setConnecting(true);
      setError(null);
      try {
        const base = await loadApiUrl();
        if (!base) {
          throw new Error('Set your desktop API URL before signing in.');
        }
        const res = await exchangeOAuthToken(provider, idToken, base);
        const cleanUrl = base.trim().replace(/\/+$/, '');
        const cleanToken = res.adtp_token.trim();
        await saveCredentials(cleanUrl, cleanToken);
        const user: UserProfile = {
          display_name: res.display_name,
          email: res.email,
          provider,
        };
        await saveProfile(user);
        setApiUrl(cleanUrl);
        setToken(cleanToken);
        setProfile(user);
        setIsAuthenticated(true);
        setOnline(true);
        setReady(true);
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : 'Sign-in failed. Could not reach your desktop — check the API URL.';
        setError(message);
        throw e;
      } finally {
        setConnecting(false);
      }
    },
    []
  );

  const saveApiUrl = useCallback(
    async (url: string) => {
      setError(null);
      const cleanUrl = url.trim().replace(/\/+$/, '');
      if (!cleanUrl) {
        throw new Error('Enter a desktop API URL.');
      }
      try {
        await getHealth(cleanUrl);
        const existingToken = await loadToken();
        await saveCredentials(cleanUrl, existingToken ?? '');
        setApiUrl(cleanUrl);
        setOnline(true);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : 'Cannot reach that URL. Check it and try again.';
        setError(message);
        throw e;
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
      profile,
      isAuthenticated,
      initialized,
      ready,
      online,
      connecting,
      error,
      health,
      biometricEnabled,
      exchangeOAuth,
      saveApiUrl,
      signOut,
      refreshReady,
      setBiometricEnabled,
    }),
    [
      apiUrl,
      token,
      profile,
      isAuthenticated,
      initialized,
      ready,
      online,
      connecting,
      error,
      health,
      biometricEnabled,
      exchangeOAuth,
      saveApiUrl,
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
