import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { DesktopConnection } from './types';

const CONNECTION_KEY = 'mars.desktop.connection';

// Web fallback mirrors sessionStorage (expo-secure-store isn't reliable on web).
// Kept out of localStorage so the token isn't persisted for web sessions.
const memoryStore: Record<string, string> = {};

const webBackend = {
  save: (value: string) => {
    memoryStore[CONNECTION_KEY] = value;
    return Promise.resolve();
  },
  load: (): Promise<string | null> => Promise.resolve(memoryStore[CONNECTION_KEY] ?? null),
  clear: () => {
    delete memoryStore[CONNECTION_KEY];
    return Promise.resolve();
  },
};

const nativeBackend = {
  save: (value: string) => SecureStore.setItemAsync(CONNECTION_KEY, value),
  load: (): Promise<string | null> => SecureStore.getItemAsync(CONNECTION_KEY),
  clear: () => SecureStore.deleteItemAsync(CONNECTION_KEY),
};

const backend = Platform.OS === 'web' ? webBackend : nativeBackend;

export const desktopStorage = {
  async save(connection: DesktopConnection): Promise<void> {
    await backend.save(JSON.stringify(connection));
  },
  async load(): Promise<DesktopConnection | null> {
    const raw = await backend.load();
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as DesktopConnection;
      return parsed?.baseUrl && parsed?.token ? parsed : null;
    } catch {
      return null;
    }
  },
  async clear(): Promise<void> {
    await backend.clear();
  },
};
