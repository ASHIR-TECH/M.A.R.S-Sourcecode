import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const INSTALL_ID_KEY = 'mars.installId';

let cached: string | null = null;

/**
 * Stable per-install identifier used only for server-side fallback-chat rate
 * limiting (PHASE_12 FR-6). Deliberately not tied to auth: quick-response mode
 * must work even when signed out. Persisted in SecureStore so the cap survives
 * restarts, with an in-memory fallback for environments without SecureStore
 * (web / tests).
 */
export async function getInstallId(): Promise<string> {
  if (cached) return cached;

  try {
    const stored = await SecureStore.getItemAsync(INSTALL_ID_KEY);
    if (stored) {
      cached = stored;
      return stored;
    }

    const created = Crypto.randomUUID();
    await SecureStore.setItemAsync(INSTALL_ID_KEY, created);
    cached = created;
    return created;
  } catch {
    cached = `ephemeral-${Math.random().toString(36).slice(2, 12)}`;
    return cached;
  }
}

/** Test seam — clears the memoized id so each test starts clean. */
export function resetInstallIdCache(): void {
  cached = null;
}
