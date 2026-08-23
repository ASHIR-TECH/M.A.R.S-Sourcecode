import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'mars.session.idToken';

export const sessionStorage = {
  async save(idToken: string): Promise<void> {
    await SecureStore.setItemAsync(SESSION_KEY, idToken);
  },
  async load(): Promise<string | null> {
    return SecureStore.getItemAsync(SESSION_KEY);
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  },
};
