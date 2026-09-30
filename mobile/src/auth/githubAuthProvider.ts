import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { AuthCancelledError, AuthProvider, OAuthGrant } from './types';

WebBrowser.maybeCompleteAuthSession();

const GITHUB_CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID ?? '';

if (__DEV__) {
  // Register this exact value as the GitHub OAuth App "Authorization callback URL".
  console.log('[auth] GitHub redirect URI:', AuthSession.makeRedirectUri(Platform.OS !== 'web' ? { path: 'auth' } : {}));
}

/**
 * GitHub's OAuth code must be exchanged using client_secret, which can never
 * ship inside the app binary. We therefore stop at the code and hand it to the
 * auth server, which performs the exchange and returns one of our own
 * sessions. The GitHub access token stays on the server: it is never returned
 * to the app and never written to device storage.
 */
export const githubAuthProvider: AuthProvider = {
  async signIn(): Promise<OAuthGrant> {
    if (!GITHUB_CLIENT_ID) {
      throw new Error('GitHub sign-in is not configured yet.');
    }

    // Expo Go dev links require the `/--/` root: `exp://<host>:<port>/--/auth`,
    // otherwise Expo Go's linking router treats the redirect as unhandled.
    // Pass a path so linking builds the full routable URL; web keeps its bare origin.
    const redirectUri = AuthSession.makeRedirectUri(Platform.OS !== 'web' ? { path: 'auth' } : {});

    const request = new AuthSession.AuthRequest({
      clientId: GITHUB_CLIENT_ID,
      scopes: ['read:user', 'user:email'],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
    });

    const discovery = {
      authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    };

    const result = await request.promptAsync(discovery);

    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new AuthCancelledError();
    }

    if (result.type !== 'success' || !result.params.code) {
      throw new Error('GitHub sign-in failed: no authorization code returned.');
    }

    return {
      provider: 'github',
      code: result.params.code,
      codeVerifier: request.codeVerifier,
      redirectUri,
    };
  },
};
