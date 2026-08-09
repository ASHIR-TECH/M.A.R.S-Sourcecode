import { useCallback, useMemo, useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '@/contexts/AuthContext';
import {
  authConfig,
  isAppleConfigured,
  isGoogleConfigured,
} from '@/constants/auth';
import type { OAuthProvider } from '@/api/types';

interface UseOAuthResult {
  busy: boolean;
  error: string | null;
  /** Starts the Google OAuth flow and exchanges the id_token with the desktop. */
  beginGoogle: () => Promise<boolean>;
  /** Starts the Apple Sign-In flow and exchanges the id_token with the desktop. */
  beginApple: () => Promise<boolean>;
  clearError: () => void;
}

const APPLE_DISCOVERY_URL = 'https://appleid.apple.com';

function makeNonce(length = 24): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/**
 * OAuth 2.0 sign-in (Google + Apple) driven by Expo Auth Session.
 *
 * The identity token returned by the provider is sent to the desktop REST API
 * (POST /api/v1/auth/oauth), which replies with the ADTP API token. Only that
 * token is persisted — provider tokens are never stored on the device.
 */
export function useOAuth(): UseOAuthResult {
  const { exchangeOAuth } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google — expo-auth-session web flow in Expo Go, native module in builds.
  const [googleRequest, googleResponse, googlePrompt] = Google.useIdTokenAuthRequest({
    clientId: authConfig.google.webClientId || undefined,
    iosClientId: authConfig.google.iosClientId || undefined,
    androidClientId: authConfig.google.androidClientId || undefined,
  });

  // Apple — Apple dropped the built-in provider from expo-auth-session v7, so
  // the web authorization request is built against Apple's discovery document.
  const appleDiscovery = AuthSession.useAutoDiscovery(APPLE_DISCOVERY_URL);
  const appleNonce = useMemo(() => makeNonce(), []);
  const [appleRequest, appleResponse, applePrompt] = AuthSession.useAuthRequest(
    {
      clientId: authConfig.apple.clientId,
      redirectUri: authConfig.apple.redirectUri,
      scopes: ['name', 'email'],
      responseType: 'id_token',
      extraParams: { nonce: appleNonce },
    },
    appleDiscovery
  );

  const complete = useCallback(
    async (provider: OAuthProvider, idToken: string) => {
      try {
        await exchangeOAuth(provider, idToken);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Sign-in failed.');
        return false;
      }
    },
    [exchangeOAuth]
  );

  const run = useCallback(
    async (provider: OAuthProvider, configured: boolean, prompt: () => Promise<unknown>) => {
      if (!configured) {
        setError(
          `${provider === 'google' ? 'Google' : 'Apple'} Sign-In is not configured on this build yet.`
        );
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const result = (await prompt()) as { type?: string; params?: Record<string, string> } | null;
        if (!result || result.type !== 'success') {
          if (result?.type === 'cancel') {
            setError('Sign-in was cancelled.');
          } else {
            setError('Sign-in failed. Could not reach your desktop — check the API URL.');
          }
          return false;
        }
        const idToken = result.params?.id_token;
        if (!idToken) {
          setError('The sign-in did not return an identity token.');
          return false;
        }
        return await complete(provider, idToken);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Sign-in failed.');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [complete]
  );

  const beginGoogle = useCallback(
    () => run('google', isGoogleConfigured, () => googlePrompt()),
    [run, googlePrompt]
  );

  const beginApple = useCallback(
    () => run('apple', isAppleConfigured, () => applePrompt()),
    [run, applePrompt]
  );

  const clearError = useCallback(() => setError(null), []);

  // Keep the hooks "used" so lint/TS stays happy and requests are configured.
  void googleRequest;
  void googleResponse;
  void appleRequest;
  void appleResponse;

  return { busy, error, beginGoogle, beginApple, clearError };
}
