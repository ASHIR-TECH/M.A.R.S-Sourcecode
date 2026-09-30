import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { AuthSession } from './types';

const SESSION_KEY = 'mars.session';

// Web fallback: expo-secure-store doesn't work reliably on web yet
const memoryStore: Record<string, string> = {};

const webStorage = {
  async save(key: string, value: string) { memoryStore[key] = value; },
  async load(key: string): Promise<string | null> { return memoryStore[key] ?? null; },
  async clear(key: string) { delete memoryStore[key]; },
};

/**
 * SecureStore reads reject when the entry can no longer be decrypted — most
 * commonly because the Android keystore key was invalidated (lock screen
 * changed, biometric enrolment reset, or the app was restored from a backup
 * onto a different device). That is not worth crashing over: the entry is
 * unreadable garbage at that point, so it is discarded and the user simply
 * signs in again.
 */
const nativeStorage = {
  async save(key: string, value: string) {
    await SecureStore.setItemAsync(key, value);
  },
  async load(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        // Already gone, or still unreadable. Either way there is no session.
      }
      return null;
    }
  },
  async clear(key: string) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // A delete that fails on a missing/invalid key is not actionable; the
      // in-memory session is dropped regardless.
    }
  },
};

const store = Platform.OS === 'web' ? webStorage : nativeStorage;

function parseSession(raw: string): AuthSession | null {
  let parsed: Partial<AuthSession> | null = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  // Shape check only. Trust is established by calling GET /auth/me, which
  // happens in restoreSession; anything that does not look like a session
  // is discarded rather than half-trusted.
  if (
    parsed &&
    typeof parsed.accessToken === 'string' &&
    parsed.accessToken.length > 0 &&
    typeof parsed.refreshToken === 'string' &&
    parsed.refreshToken.length > 0 &&
    typeof parsed.expiresAt === 'number' &&
    parsed.user &&
    typeof parsed.user.id === 'string' &&
    parsed.user.id.length > 0
  ) {
    return parsed as AuthSession;
  }

  return null;
}

export const sessionStorage = {
  /** Never throws: a failed write must not break an otherwise valid sign-in. */
  async save(session: AuthSession): Promise<void> {
    try {
      await store.save(SESSION_KEY, JSON.stringify(session));
    } catch {
      // The session still works for this app run; it just won't survive a
      // restart, and the user will re-authenticate next launch.
    }
  },

  async load(): Promise<AuthSession | null> {
    try {
      const raw = await store.load(SESSION_KEY);
      if (!raw) return null;
      return parseSession(raw);
    } catch {
      return null;
    }
  },

  async clear(): Promise<void> {
    await store.clear(SESSION_KEY);
  },
};
