import { apiFetch } from './client';
import type { OAuthProvider, OAuthTokenExchange } from './types';

/**
 * POST /api/v1/auth/oauth — exchanges an OAuth identity token from Google or
 * Apple for the ADTP API token stored on the desktop peer's keychain.
 *
 * This is the bootstrapping endpoint: no Bearer header is required. The
 * desktop peer verifies the id_token with the provider before responding.
 */
export function exchangeOAuthToken(
  provider: OAuthProvider,
  idToken: string,
  baseUrl?: string
): Promise<OAuthTokenExchange> {
  return apiFetch<OAuthTokenExchange>('/api/v1/auth/oauth', {
    method: 'POST',
    body: JSON.stringify({ provider, id_token: idToken }),
    baseUrl,
    auth: false,
  });
}
