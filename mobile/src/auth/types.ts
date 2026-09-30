export type AuthProviderName = 'google' | 'github' | 'apple';

/** The provider-agnostic identity our server vouches for. */
export interface AuthUser {
  id: string;
  provider: AuthProviderName;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

/**
 * An app-owned session. The provider's own credential is exchanged on the
 * server and never persisted on the device.
 */
export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds at which the access token stops being accepted. */
  expiresAt: number;
}

/**
 * Raw material obtained from a provider, before anything has been verified.
 * The server turns this into an {@link AuthSession}.
 */
export type OAuthGrant =
  | {
      provider: 'google' | 'github';
      code: string;
      codeVerifier?: string;
      redirectUri: string;
      nonce?: string;
    }
  | { provider: 'apple'; idToken: string; nonce?: string; name?: string };

export interface AuthProvider {
  signIn(): Promise<OAuthGrant>;
}

/** Thrown when the user closes the OAuth flow themselves — not a real error. */
export class AuthCancelledError extends Error {
  constructor() {
    super('Authentication was cancelled by the user.');
    this.name = 'AuthCancelledError';
  }
}

/** Treat a token as expired slightly early so requests don't race the clock. */
export function isSessionExpired(session: AuthSession, skewMs = 30_000): boolean {
  return session.expiresAt - skewMs <= Date.now();
}
