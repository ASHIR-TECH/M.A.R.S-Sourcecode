import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'mars.session.idToken';

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
  async save(idToken: string): Promise<void> {
    await store.save(SESSION_KEY, idToken);
  },
  async load(): Promise<string | null> {
    return store.load(SESSION_KEY);
  },
  async clear(): Promise<void> {
    await store.clear(SESSION_KEY);
  },
};
