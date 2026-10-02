import { toAuthSession, toAuthUser } from './sessionMapper';
import type { Session, User } from '@supabase/supabase-js';

function user(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'ada@example.com',
    email_confirmed_at: '2026-01-01T00:00:00Z',
    app_metadata: { provider: 'google' },
    user_metadata: { full_name: 'Ada', avatar_url: 'https://example.com/a.png' },
    identities: [{ provider: 'google' }],
    ...overrides,
  } as unknown as User;
}

describe('toAuthUser', () => {
  it('maps the provider, verified email, name and picture', () => {
    expect(toAuthUser(user())).toEqual({
      id: 'user-1',
      provider: 'google',
      email: 'ada@example.com',
      emailVerified: true,
      name: 'Ada',
      picture: 'https://example.com/a.png',
    });
  });

  it('prefers app_metadata, which the user cannot forge', () => {
    // user_metadata is user-editable and must never drive authorization.
    const forged = user({
      app_metadata: { provider: 'github' },
      user_metadata: { full_name: 'Ada', provider: 'apple' },
    } as never);
    expect(toAuthUser(forged).provider).toBe('github');
  });

  it('falls back to the linked identity when app_metadata is absent', () => {
    const bare = user({ app_metadata: {}, identities: [{ provider: 'github' }] } as never);
    expect(toAuthUser(bare).provider).toBe('github');
  });

  it('reads GitHub username and avatar fallbacks', () => {
    const gh = user({
      app_metadata: { provider: 'github' },
      user_metadata: { preferred_username: 'ada', avatar_url: 'https://gh.example/a.png' },
    } as never);
    expect(toAuthUser(gh).name).toBe('ada');
    expect(toAuthUser(gh).picture).toBe('https://gh.example/a.png');
  });

  it('treats a null email and a missing name as null rather than crashing', () => {
    const anon = user({ email: null, email_confirmed_at: null, user_metadata: {} } as never);
    const mapped = toAuthUser(anon);
    expect(mapped.email).toBeNull();
    expect(mapped.emailVerified).toBe(false);
    expect(mapped.name).toBeNull();
    expect(mapped.picture).toBeNull();
  });

  it('does not treat an empty-string name as a real name', () => {
    const blank = user({ user_metadata: { full_name: '', name: '   ' } } as never);
    expect(toAuthUser(blank).name).toBeNull();
  });
});

describe('toAuthSession', () => {
  it('converts expires_at seconds into milliseconds', () => {
    const session = {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_at: 1_800_000_000,
      user: user(),
    } as unknown as Session;

    const mapped = toAuthSession(session);
    expect(mapped.expiresAt).toBe(1_800_000_000_000);
    expect(mapped.accessToken).toBe('access-token');
    expect(mapped.refreshToken).toBe('refresh-token');
  });

  it('treats a missing expires_at as already expired rather than infinite', () => {
    const session = {
      access_token: 'a',
      refresh_token: 'r',
      expires_at: null,
      user: user(),
    } as unknown as Session;

    // A silent "never expires" here would hide a revoked session indefinitely.
    expect(toAuthSession(session).expiresAt).toBe(0);
  });
});