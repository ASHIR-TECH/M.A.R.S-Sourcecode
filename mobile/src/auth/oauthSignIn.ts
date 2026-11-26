import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type { Provider } from '@supabase/supabase-js';
import { requireSupabase } from './supabaseClient';
import { AuthCancelledError } from './types';

// Required for the browser auth session to be dismissed correctly on web.
WebBrowser.maybeCompleteAuthSession();

/**
 * The deep link the OAuth provider returns to once the user has chosen an
 * account. Must match `scheme` in app.json (`mars`) and be listed under
 * Authentication -> URL Configuration -> Additional Redirect URLs in the
 * Supabase dashboard, otherwise Supabase silently refuses the final exchange.
 */
export function oauthRedirectUri(): string {
  return AuthSession.makeRedirectUri({ path: 'auth' });
}

/**
 * Collects parameters from both halves of a redirect URL.
 *
 * This matters: depending on which flow Supabase completes, the tokens arrive
 * either in the fragment (`#access_token=...`, the implicit delivery) or in the
 * query string (`?code=...`, PKCE). Reading only one half means sign-in works
 * in testing and then fails on a device, so we accept either.
 */
function callbackParams(url: string): Record<string, string> {
  const hashIndex = url.indexOf('#');
  const beforeHash = hashIndex === -1 ? url : url.slice(0, hashIndex);

  // The query string lives after '?' in the pre-fragment half; the fragment is
  // itself the query string, so it must not be split on '?'.
  const queryString = beforeHash.split('?')[1] ?? '';
  const fragment = hashIndex === -1 ? '' : url.slice(hashIndex + 1);

  const merged: Record<string, string> = {};
  for (const source of [queryString, fragment]) {
    if (!source) continue;
    for (const [key, value] of new URLSearchParams(source)) {
      // A fragment value wins: it is the one Supabase actually delivered.
      if (!(key in merged)) merged[key] = value;
    }
  }
  return merged;
}

/**
 * Exchanges what the OAuth callback delivered for a real Supabase session.
 *
 * This is the documented Expo + supabase-js pattern: `skipBrowserRedirect` keeps
 * supabase-js from navigating itself, the system browser does the actual
 * sign-in, and the deep link hands control back to us here.
 */
/**
 * Supabase PKCE codes are single-use. The browser flow resolves the URL and the
 * App-level deep-link listener can see the same URL; exchanging it twice makes
 * the second call fail with "invalid flow state, no valid flow state found".
 * Remember callbacks we have already handled and never exchange one twice.
 */
const handledCallbacks = new Set<string>();

/** Test-only reset so tests can start each case with a clean callback slate. */
export function resetOAuthCallbackState(): void {
  handledCallbacks.clear();
}

function callbackKey(params: Record<string, string>): string | null {
  if (params.code) return `code:${params.code}`;
  if (params.access_token) return `tokens:${params.access_token}`;
  return null;
}

async function sessionFromCallbackUrl(url: string): Promise<void> {
  const params = callbackParams(url);

  // Supabase reports refusals by putting an error in the redirect rather than
  // by failing the HTTP call, so this is the only place they surface.
  const errorCode = params.error_description ?? params.error;
  if (errorCode) throw new Error(decodeURIComponent(errorCode.replace(/\+/g, ' ')));

  const key = callbackKey(params);
  if (!key) throw new Error('Sign-in failed: the provider did not return a usable session.');
  if (handledCallbacks.has(key)) return; // already exchanged by the other path
  handledCallbacks.add(key);

  const auth = requireSupabase().auth;
  try {
    if (params.code) {
      // PKCE delivery: supabase-js already holds the matching code_verifier.
      const { error } = await auth.exchangeCodeForSession(params.code);
      if (error) throw error;
      return;
    }

    const { error } = await auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) throw error;
  } catch (error) {
    // A failed exchange did not consume the flow state; allow a clean retry.
    handledCallbacks.delete(key);
    const errorCode = (error as { error_code?: string } | null)?.error_code;
    if (errorCode === 'flow_state_not_found' || errorCode === 'flow_state_expired') {
      throw new Error('Sign-in expired. Please try again.');
    }
    throw error;
  }
}

/**
 * Runs an OAuth sign-in and resolves once Supabase holds a live session.
 *
 * Throws {@link AuthCancelledError} when the user backs out of the browser,
 * which the store treats as a no-op rather than an error.
 */
export async function signInWithOAuthProvider(provider: Provider): Promise<void> {
  const supabase = requireSupabase();
  const redirectTo = oauthRedirectUri();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      // We open the browser ourselves so the result comes back through the
      // deep link instead of supabase-js redirecting the whole app.
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error('Sign-in failed: no authorisation URL was returned.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new AuthCancelledError();
  }

  if (result.type !== 'success') {
    throw new Error('Sign-in failed before it could be completed.');
  }

  await sessionFromCallbackUrl(result.url);
}

/**
 * Completes a sign-in that arrived as a cold-start deep link, where
 * `openAuthSessionAsync` was never running to catch it.
 */
export async function completeOAuthFromUrl(url: string): Promise<void> {
  if (!url.startsWith(oauthRedirectUri().split('?')[0])) return;
  await sessionFromCallbackUrl(url);
}