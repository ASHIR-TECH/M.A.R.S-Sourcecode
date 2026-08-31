import * as AuthSession from 'expo-auth-session';
import { AuthProvider, AuthResult, AuthCancelledError } from './types';

const GITHUB_CLIENT_ID = process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID ?? '';
const AUTH_RELAY_URL = process.env.EXPO_PUBLIC_AUTH_RELAY_URL ?? '';

if (__DEV__) {
  // Register this exact value as the GitHub OAuth App "Authorization callback URL".
  console.log('[auth] GitHub redirect URI:', AuthSession.makeRedirectUri());
}

/**
 * GitHub's OAuth code must be exchanged for a token using client_secret,
 * which can never ship inside the app binary. The exchange is delegated
 * to a relay endpoint that wraps POST https://github.com/login/oauth/access_token.
 * Expected relay contract: POST { code, redirectUri } -> { access_token }.
 */
export const githubAuthProvider: AuthProvider = {
  async signIn(): Promise<AuthResult> {
    if (!GITHUB_CLIENT_ID) {
      throw new Error('GitHub sign-in is not configured yet.');
    }

    const redirectUri = AuthSession.makeRedirectUri();

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

    if (!AUTH_RELAY_URL) {
      throw new Error('GitHub sign-in is not configured yet.');
    }

    const response = await fetch(AUTH_RELAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: result.params.code, redirectUri, codeVerifier: request.codeVerifier }),
    });

    if (!response.ok) {
      throw new Error('GitHub sign-in failed during token exchange.');
    }

    const payload = (await response.json()) as { access_token?: string };

    if (!payload.access_token) {
      throw new Error('GitHub sign-in failed: no access token returned.');
    }

    // Fetch the user's profile now that we hold an access token, so the UI
    // can render name / email / avatar (Phase 7 FR-1/FR-6).
    const profileResponse = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${payload.access_token}` },
    });

    if (!profileResponse.ok) {
      throw new Error('GitHub sign-in failed: could not fetch profile.');
    }

    const profile = (await profileResponse.json()) as {
      name?: string | null;
      login?: string;
      email?: string | null;
      avatar_url?: string;
    };

    return {
      idToken: payload.access_token,
      provider: 'github',
      fullName: profile.name || profile.login || undefined,
      email: profile.email ?? undefined,
      photoUrl: profile.avatar_url,
    };
  },
};
