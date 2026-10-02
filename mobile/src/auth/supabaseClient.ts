import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { secureStorageAdapter } from './secureStoreAdapter';

/**
 * Supabase project configuration.
 *
 * The publishable key is intentionally bundled in the client. It is designed to
 * be public and only grants the `anon` role, which Row Level Security then
 * restricts. The secret `service_role` key must never appear here -- it bypasses
 * RLS entirely, and anything shipped in a mobile bundle is readable by anyone
 * who unpacks the APK.
 */
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // Keep sessions in the keystore rather than AsyncStorage.
        storage: secureStorageAdapter,
        // Supabase rotates the refresh token on its own; letting the client
        // also try to refresh creates a race that can invalidate a good token.
        autoRefreshToken: true,
        persistSession: true,
        // We complete OAuth ourselves from the deep-link URL, so supabase-js
        // should not also try to parse a session out of the initial page load.
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;

/** Throws a message aimed at the developer rather than the end user. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Sign-in is not configured yet. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env, then rebuild with `npx expo start -c`.'
    );
  }
  return supabase;
}