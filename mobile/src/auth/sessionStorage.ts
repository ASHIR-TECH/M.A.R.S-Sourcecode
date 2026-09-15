import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthResult } from './types';

const SESSION_KEY = 'mars.session';

// Web fallback: expo-secure-store doesn't work reliably on web yet
const memoryStore: Record<string, string> = {};

const webStorage = {
  async save(key: string, value: string) { memoryStore[key] = value; },
  async load(key: string): Promise<string | null> { return memoryStore[key] ?? null; },
  async clear(key: string) { delete memoryStore[key]; },
};

const nativeStorage = {
  async save(key: string, value: string) { await SecureStore.setItemAsync(key, value); },
  async load(key: string): Promise<string | null> { return SecureStore.getItemAsync(key); },
  async clear(key: string) { await SecureStore.deleteItemAsync(key); },
};

const store = Platform.OS === 'web' ? webStorage : nativeStorage;

export const sessionStorage = {
  async save(session: AuthResult): Promise<void> {
    await store.save(SESSION_KEY, JSON.stringify(session));
  },
  async load(): Promise<AuthResult | null> {
    const raw = await store.load(SESSION_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.idToken === 'string') return parsed as AuthResult;
    } catch {
      // not a JSON payload — treat as no session
    }
    return null;
  },
  async clear(): Promise<void> {
    await store.clear(SESSION_KEY);
  },
};
