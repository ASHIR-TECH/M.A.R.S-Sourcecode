import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { AuthProvider, AuthResult, AuthCancelledError } from './types';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

if (__DEV__) {
  console.log('[auth] Google redirect URI:', AuthSession.makeRedirectUri());
}

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export const googleAuthProvider: AuthProvider = {
  async signIn(): Promise<AuthResult> {
    const redirectUri = AuthSession.makeRedirectUri();

    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
    });

    const result = await request.promptAsync(discovery);

    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new AuthCancelledError();
    }

    if (result.type !== 'success' || !result.params.id_token) {
      throw new Error('Google sign-in failed: no ID token returned.');
    }

    return {
      idToken: result.params.id_token,
      provider: 'google',
    };
  },
};
