import * as SecureStore from 'expo-secure-store';
import type { UserProfile } from './types';

const API_URL_KEY = 'adtp_api_url';
const TOKEN_KEY = 'adtp_api_token';
const PROFILE_KEY = 'mars_profile';

let cachedUrl: string | null = null;
let cachedToken: string | null = null;
let cachedProfile: UserProfile | null = null;

async function getItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function loadApiUrl(): Promise<string | null> {
  if (cachedUrl === null) {
    cachedUrl = await getItem(API_URL_KEY);
  }
  return cachedUrl;
}

export async function loadToken(): Promise<string | null> {
  if (cachedToken === null) {
    cachedToken = await getItem(TOKEN_KEY);
  }
  return cachedToken;
}

export async function saveCredentials(apiUrl: string, token: string): Promise<void> {
  const cleanUrl = apiUrl.trim().replace(/\/+$/, '');
  const cleanToken = token.trim();
  await SecureStore.setItemAsync(API_URL_KEY, cleanUrl);
  await SecureStore.setItemAsync(TOKEN_KEY, cleanToken);
  cachedUrl = cleanUrl;
  cachedToken = cleanToken;
}

export async function clearCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(API_URL_KEY);
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(PROFILE_KEY);
  cachedUrl = null;
  cachedToken = null;
  cachedProfile = null;
}

/** Load the persisted OAuth user profile (display name, email, provider). */
export async function loadProfile(): Promise<UserProfile | null> {
  if (cachedProfile === null) {
    try {
      const raw = await getItem(PROFILE_KEY);
      cachedProfile = raw ? (JSON.parse(raw) as UserProfile) : null;
    } catch {
      cachedProfile = null;
    }
  }
  return cachedProfile;
}

/** Persist the OAuth user profile alongside the ADTP API token. */
export async function saveProfile(profile: UserProfile): Promise<void> {
  await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(profile));
  cachedProfile = profile;
}

/** Force a re-read from secure storage on the next load (used after sign-in). */
export function invalidateCredentialsCache(): void {
  cachedUrl = null;
  cachedToken = null;
  cachedProfile = null;
}

export { API_URL_KEY, TOKEN_KEY, PROFILE_KEY };
