import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * A `SupportedStorage` adapter for supabase-js, backed by the Android
 * keystore / iOS keychain via expo-secure-store.
 *
 * Why not AsyncStorage, which is the usual choice? Because a session grants
 * real access to the user's account. AsyncStorage is plain unencrypted files in
 * the app sandbox, so on a rooted device or a stolen backup the refresh token is
 * readable. SecureStore keeps it behind hardware-backed encryption.
 *
 * Every method swallows its own failures. Supabase calls this adapter during
 * client startup, and an exception escaping here would take down auth
 * initialisation entirely -- a corrupt or undecryptable entry is simply "no
 * session", which is the correct interpretation anyway.
 */

// expo-secure-store does not work reliably on web, so fall back to memory.
// Consequence: web sessions do not survive a page reload.
const memoryStore = new Map<string, string>();

const secureStore = {
  async getItem(key: string): Promise<string | null> {
    return (await SecureStore.getItemAsync(key)) ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
};

const memory = {
  async getItem(key: string): Promise<string | null> {
    return memoryStore.get(key) ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    memoryStore.set(key, value);
  },
  async removeItem(key: string): Promise<void> {
    memoryStore.delete(key);
  },
};

const backend = Platform.OS === 'web' ? memory : secureStore;

/**
 * SecureStore reads reject when the entry can no longer be decrypted -- most
 * often because the Android keystore key was invalidated (lock-screen change,
 * biometric reset, or restore from backup onto another device). We try to clear
 * the dead entry so the next write starts clean, but treat a failed delete as
 * irrelevant: either way there is no session to restore.
 */
export const secureStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return backend.getItem(key);
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      try {
        await SecureStore.deleteItemAsync(key);
      } catch {
        // Already gone, or still unreadable.
      }
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await backend.setItem(key, value);
    } catch {
      // The session still works for this app run; it just will not survive a
      // restart and the user will sign in again next launch.
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await backend.removeItem(key);
    } catch {
      // A delete that fails on a missing or invalid key is not actionable.
    }
  },
};