import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { appCredentials } from '@/config/credentials';
import { setToken, setUserInfo, setApiUrl } from '@/lib/storage';

const AppleAuthentication = Platform.OS === 'web'
  ? null
  : require('expo-apple-authentication');

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export function useGoogleAuth() {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: appCredentials.scheme,
    path: 'google-callback',
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId:
        Platform.OS === 'ios'
          ? appCredentials.google.iosClientId
          : appCredentials.google.androidClientId,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      usePKCE: true,
    },
    discovery,
  );

  return { request, response, promptAsync, redirectUri };
}

export async function exchangeGoogleToken(
  idToken: string,
  apiUrl: string,
): Promise<{ token: string; displayName: string; email: string }> {
  const res = await fetch(`${apiUrl.replace(/\/+$/, '')}/api/v1/auth/oauth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'google', id_token: idToken }),
  });

  if (!res.ok) {
    throw new Error(`OAuth exchange failed: ${res.status}`);
  }

  const data = await res.json();
  return {
    token: data.adtp_token,
    displayName: data.display_name,
    email: data.email,
  };
}

export async function signInWithApple(): Promise<{
  idToken: string;
  displayName: string;
  email: string;
}> {
  if (!AppleAuthentication) {
    throw new Error('Apple Sign-In is not available on web');
  }
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('No identity token from Apple');
  }

  const displayName = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(' ') || 'User';

  const email = credential.email || '';

  return {
    idToken: credential.identityToken,
    displayName,
    email,
  };
}

export async function completeAuth(
  provider: 'google' | 'apple',
  idToken: string,
  displayName: string,
  email: string,
  apiUrl: string,
): Promise<void> {
  const result = await exchangeGoogleToken(idToken, apiUrl);
  await Promise.all([
    setToken(result.token),
    setUserInfo(result.displayName || displayName, result.email || email),
    setApiUrl(apiUrl),
  ]);
}
