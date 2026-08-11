import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '@/contexts/AuthContext';
import { authConfig, isGoogleConfigured } from '@/constants/auth';
import type { OAuthProvider } from '@/api/types';

interface UseOAuthResult {
  busy: boolean;
  error: string | null;
  /** Starts the Google OAuth flow and exchanges the id_token with the desktop. */
  beginGoogle: () => Promise<boolean>;
  /** Starts native Sign in with Apple and exchanges the id_token with the desktop. */
  beginApple: () => Promise<boolean>;
  clearError: () => void;
}

/**
 * OAuth 2.0 sign-in (Google + Apple).
 *
 * Google runs the expo-auth-session web flow and returns an id_token. Apple uses
 * the native `expo-apple-authentication` module, which hands the identity token
 * straight back (iOS only). Either way the token is sent to the desktop REST API
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

  const beginGoogle = useCallback(async () => {
    if (!isGoogleConfigured) {
      setError('Google Sign-In is not configured on this build yet.');
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      const result = (await googlePrompt()) as { type?: string; params?: Record<string, string> } | null;
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
      return await complete('google', idToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [complete, googlePrompt]);

  const beginApple = useCallback(async () => {
    if (Platform.OS !== 'ios') {
      setError('Sign in with Apple is only available on iPhone.');
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      const AppleAuthentication = await import('expo-apple-authentication');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const idToken = credential.identityToken;
      if (!idToken) {
        setError('Apple did not return an identity token.');
        return false;
      }
      return await complete('apple', idToken);
    } catch (e) {
      if ((e as { code?: unknown }).code === 'ERR_REQUEST_CANCELED') {
        setError('Sign-in was cancelled.');
      } else {
        setError(e instanceof Error ? e.message : 'Sign-in failed.');
      }
      return false;
    } finally {
      setBusy(false);
    }
  }, [complete]);

  const clearError = useCallback(() => setError(null), []);

  // Keep the hook "used" so lint/TS stays happy and the request is configured.
  void googleRequest;
  void googleResponse;

  return { busy, error, beginGoogle, beginApple, clearError };
}
