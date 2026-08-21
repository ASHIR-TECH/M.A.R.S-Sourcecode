import { Platform } from 'react-native';

const KEYS = {
  TOKEN: 'adtp_token',
  API_URL: 'adtp_api_url',
  DISPLAY_NAME: 'adtp_display_name',
  EMAIL: 'adtp_email',
} as const;

const isWeb = Platform.OS === 'web';

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  const SecureStore = require('expo-secure-store');
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      localStorage.setItem(key, value);
    } catch {}
    return;
  }
  const SecureStore = require('expo-secure-store');
  await SecureStore.setItemAsync(key, value);
}

async function removeItem(key: string): Promise<void> {
  if (isWeb) {
    try {
      localStorage.removeItem(key);
    } catch {}
    return;
  }
  const SecureStore = require('expo-secure-store');
  await SecureStore.deleteItemAsync(key);
}

export async function getToken(): Promise<string | null> {
  return getItem(KEYS.TOKEN);
}

export async function setToken(token: string): Promise<void> {
  await setItem(KEYS.TOKEN, token);
}

export async function getApiUrl(): Promise<string | null> {
  return getItem(KEYS.API_URL);
}

export async function setApiUrl(url: string): Promise<void> {
  await setItem(KEYS.API_URL, url);
}

export async function getUserInfo(): Promise<{ displayName: string | null; email: string | null }> {
  const [displayName, email] = await Promise.all([
    getItem(KEYS.DISPLAY_NAME),
    getItem(KEYS.EMAIL),
  ]);
  return { displayName, email };
}

export async function setUserInfo(displayName: string, email: string): Promise<void> {
  await Promise.all([
    setItem(KEYS.DISPLAY_NAME, displayName),
    setItem(KEYS.EMAIL, email),
  ]);
}

export async function clearAll(): Promise<void> {
  await Promise.all([
    removeItem(KEYS.TOKEN),
    removeItem(KEYS.API_URL),
    removeItem(KEYS.DISPLAY_NAME),
    removeItem(KEYS.EMAIL),
  ]);
}
