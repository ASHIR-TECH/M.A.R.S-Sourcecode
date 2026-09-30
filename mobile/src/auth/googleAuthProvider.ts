import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { AuthCancelledError, AuthProvider, OAuthGrant } from './types';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

if (__DEV__) {
  console.log('[auth] Google redirect URI:', AuthSession.makeRedirectUri(Platform.OS !== 'web' ? { path: 'auth' } : {}));
}

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export const googleAuthProvider: AuthProvider = {
  async signIn(): Promise<OAuthGrant> {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('Google sign-in is not configured yet.');
    }

    // Expo Go dev links require the `/--/` root, see githubAuthProvider.
    const redirectUri = AuthSession.makeRedirectUri(Platform.OS !== 'web' ? { path: 'auth' } : {});

    // Binds the returned ID token to this sign-in attempt. The server checks
    // the nonce, so a token captured elsewhere cannot be replayed at us.
    const nonce = Crypto.randomUUID();

    // Authorization Code + PKCE rather than the implicit flow: the code is
    // single-use and the verifier never leaves the device, and the server can
    // exchange it for a verified identity.
    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      extraParams: { nonce, access_type: 'online' },
    });

    const result = await request.promptAsync(discovery);

    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new AuthCancelledError();
    }

    if (result.type !== 'success' || !result.params.code) {
      throw new Error('Google sign-in failed: no authorization code returned.');
    }

    return {
      provider: 'google',
      code: result.params.code,
      codeVerifier: request.codeVerifier,
      redirectUri,
      nonce,
    };
  },
};
