import { loadApiUrl, loadToken } from './storage';

/** Typed error surfaced to the UI. `code` distinguishes failure modes. */
export class AppError extends Error {
  readonly code: 'NETWORK' | 'HTTP' | 'AUTH';
  readonly status?: number;

  constructor(code: AppError['code'], message: string, status?: number) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}

interface UnauthorizedHandler {
  (reason: '401'): void;
}

let onUnauthorized: UnauthorizedHandler | null = null;

/** The AuthContext registers this so a 401 can sign the user out to Login. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

/** Readable message mapping for common HTTP status codes. */
export function statusToMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Bad request — the server rejected the payload.';
    case 401:
      return 'Unauthorized — check your API token.';
    case 403:
      return 'Forbidden — the token does not allow this operation.';
    case 404:
      return 'Not found — the desktop peer does not expose this endpoint.';
    case 429:
      return 'Too many requests — try again shortly.';
    case 500:
      return 'Server error on the desktop peer.';
    default:
      return `Unexpected response (HTTP ${status}).`;
  }
}

function normalizeUrl(base: string, path: string): string {
  const clean = base.trim().replace(/\/+$/, '');
  return `${clean}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * fetch wrapper used by every API module. Injects the Bearer token, maps
 * network failures to AppError(NETWORK), and redirects to login on 401.
 */
export interface ApiFetchOptions extends RequestInit {
  /** Override the stored API URL for a single request (e.g. connection test). */
  baseUrl?: string;
  /** Override the Bearer token for a single request (e.g. token validation). */
  token?: string;
  /** Skip the Bearer header entirely — used by the OAuth bootstrap endpoint. */
  auth?: boolean;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { baseUrl, token: tokenOverride, auth = true, ...rest } = options;
  const base = baseUrl ?? (await loadApiUrl());
  if (!base) {
    throw new AppError('AUTH', 'Not connected to a desktop peer.');
  }

  const token = tokenOverride ?? (await loadToken());
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...((rest.headers as Record<string, string>) ?? {}),
  };
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (rest.body && typeof rest.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(normalizeUrl(base, path), {
      ...rest,
      headers,
    });
  } catch {
    throw new AppError('NETWORK', 'Cannot reach the desktop peer. Check the API URL and your connection.');
  }

  if (response.status === 401) {
    onUnauthorized?.('401');
    throw new AppError('AUTH', statusToMessage(401), 401);
  }

  if (!response.ok) {
    throw new AppError('HTTP', statusToMessage(response.status), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  return (await response.text()) as unknown as T;
}

export function encodePathParam(value: string): string {
  return encodeURIComponent(value);
}
