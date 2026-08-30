import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { PairingPayload } from './types';

const PAIRING_KEY = 'mars.pairing.desktop';

// Web fallback mirrors sessionStorage: expo-secure-store isn't reliable on web
const memoryStore: Record<string, string> = {};

const webBackend = {
  save: (value: string) => {
    memoryStore[PAIRING_KEY] = value;
    return Promise.resolve();
  },
  load: (): Promise<string | null> => Promise.resolve(memoryStore[PAIRING_KEY] ?? null),
  clear: () => {
    delete memoryStore[PAIRING_KEY];
    return Promise.resolve();
  },
};

const nativeBackend = {
  save: (value: string) => SecureStore.setItemAsync(PAIRING_KEY, value),
  load: (): Promise<string | null> => SecureStore.getItemAsync(PAIRING_KEY),
  clear: () => SecureStore.deleteItemAsync(PAIRING_KEY),
};

const backend = Platform.OS === 'web' ? webBackend : nativeBackend;

export const pairingStorage = {
  async save(payload: PairingPayload): Promise<void> {
    await backend.save(JSON.stringify(payload));
  },
  async load(): Promise<PairingPayload | null> {
    const raw = await backend.load();
    return raw ? (JSON.parse(raw) as PairingPayload) : null;
  },
  async clear(): Promise<void> {
    await backend.clear();
  },
};