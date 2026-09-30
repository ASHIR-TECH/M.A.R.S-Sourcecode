import { AuthSession, AuthUser, OAuthGrant } from './types';

const RAW_BASE = process.env.EXPO_PUBLIC_AUTH_SERVER_URL ?? '';
export const AUTH_SERVER_URL = RAW_BASE.replace(/\/+$/, '');

export class AuthApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.code = code;
  }
}

interface SessionResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

function toSession(response: SessionResponse): AuthSession {
  return {
    user: response.user,
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresAt: Date.now() + response.expiresIn * 1000,
  };
}

async function fail(res: Response): Promise<never> {
  let message = `Request failed (${res.status}).`;
  let code = 'unknown';

  try {
    const body = (await res.json()) as { error?: { message?: string; code?: string } };
    if (body?.error?.message) message = body.error.message;
    if (body?.error?.code) code = body.error.code;
  } catch {
    // Non-JSON error body; keep the generic message.
  }

  throw new AuthApiError(message, res.status, code);
}

function requireServerUrl() {
  if (!AUTH_SERVER_URL) {
    throw new AuthApiError(
      'Sign-in is not configured yet. Set EXPO_PUBLIC_AUTH_SERVER_URL.',
      0,
      'not_configured'
    );
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  requireServerUrl();
  const res = await fetch(`${AUTH_SERVER_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) return fail(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function get<T>(path: string, accessToken: string): Promise<T> {
  requireServerUrl();
  const res = await fetch(`${AUTH_SERVER_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return fail(res);
  return (await res.json()) as T;
}

export const authClient = {
  /** Trade a provider grant for an app session. */
  signIn(grant: OAuthGrant): Promise<AuthSession> {
    return post<SessionResponse>('/auth/signin', grant).then(toSession);
  },

  /** Rotate the refresh token; the old one stops working immediately. */
  refresh(refreshToken: string): Promise<AuthSession> {
    return post<SessionResponse>('/auth/refresh', { refreshToken }).then(toSession);
  },

  logout(refreshToken: string, allSessions = false): Promise<void> {
    return post<void>('/auth/logout', { refreshToken, allSessions });
  },

  /** Confirm a session is still valid, and pick up profile changes. */
  me(accessToken: string): Promise<AuthUser> {
    return get<{ user: AuthUser }>('/auth/me', accessToken).then((body) => body.user);
  },
};
