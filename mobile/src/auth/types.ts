export type AuthProviderName = 'google' | 'github' | 'apple';

/** The provider-agnostic identity Supabase vouches for. */
export interface AuthUser {
  id: string;
  provider: AuthProviderName;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

/**
 * An app-owned view of a Supabase session.
 *
 * Supabase persists and refreshes the real session itself (see
 * supabaseClient.ts), so this is a read-only projection for the UI rather than
 * something we write back. The provider's own credential is exchanged on
 * Supabase's servers and never persisted on the device.
 */
export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds at which the access token stops being accepted. */
  expiresAt: number;
}

/** Thrown when the user closes the OAuth flow themselves -- not a real error. */
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