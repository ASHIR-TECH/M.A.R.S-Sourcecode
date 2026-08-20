import * as SecureStore from 'expo-secure-store';

const KEYS = {
  TOKEN: 'adtp_token',
  API_URL: 'adtp_api_url',
  DISPLAY_NAME: 'adtp_display_name',
  EMAIL: 'adtp_email',
} as const;

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.TOKEN);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.TOKEN, token);
}

export async function getApiUrl(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.API_URL);
}

export async function setApiUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.API_URL, url);
}

export async function getUserInfo(): Promise<{ displayName: string | null; email: string | null }> {
  const [displayName, email] = await Promise.all([
    SecureStore.getItemAsync(KEYS.DISPLAY_NAME),
    SecureStore.getItemAsync(KEYS.EMAIL),
  ]);
  return { displayName, email };
}

export async function setUserInfo(displayName: string, email: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEYS.DISPLAY_NAME, displayName),
    SecureStore.setItemAsync(KEYS.EMAIL, email),
  ]);
}

export async function clearAll(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.TOKEN),
    SecureStore.deleteItemAsync(KEYS.API_URL),
    SecureStore.deleteItemAsync(KEYS.DISPLAY_NAME),
    SecureStore.deleteItemAsync(KEYS.EMAIL),
  ]);
}
