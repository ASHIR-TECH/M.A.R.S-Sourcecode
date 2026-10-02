import type { Session, User } from '@supabase/supabase-js';
import type { AuthProviderName, AuthSession, AuthUser } from './types';

/**
 * Projects Supabase's auth shapes onto the app's own, so the rest of the app
 * never imports from @supabase/supabase-js directly. That keeps the door open to
 * swapping the auth backend without touching a single screen.
 */

function providerOf(user: User | null): AuthProviderName {
  // `app_metadata.provider` is set by the auth server and is not user-writable,
  // unlike `user_metadata`. Prefer it, and fall back to the linked identity.
  const claimed = user?.app_metadata?.provider;
  if (claimed === 'google' || claimed === 'github' || claimed === 'apple') {
    return claimed;
  }
  const linked = user?.identities?.[0]?.provider;
  if (linked === 'google' || linked === 'github' || linked === 'apple') {
    return linked;
  }
  return 'google';
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    // Providers do return whitespace-only names ("  ", "\n"), which would
    // otherwise render as a blank line where the user's name should be.
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

export function toAuthUser(user: User): AuthUser {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

  return {
    id: user.id,
    provider: providerOf(user),
    email: user.email ?? null,
    // Supabase marks provider-asserted emails as confirmed at first sign-in,
    // because Google and GitHub have already verified them.
    emailVerified: Boolean(user.email_confirmed_at ?? user.confirmed_at),
    name: firstString(meta.full_name, meta.name, meta.preferred_username, meta.user_name),
    picture: firstString(meta.avatar_url, meta.picture, meta.image_url),
  };
}

export function toAuthSession(session: Session): AuthSession {
  return {
    user: toAuthUser(session.user),
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    // `expires_at` is seconds since the epoch; the app works in milliseconds.
    expiresAt: (session.expires_at ?? 0) * 1000,
  };
}