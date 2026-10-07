import { supabase, isSupabaseConfigured } from '../auth/supabaseClient';
import type { AppChatContext } from './appContext';

const FUNCTION_NAME = 'qwen-chat';

type AuthSubscription = ReturnType<NonNullable<typeof supabase>['auth']['onAuthStateChange']>;

let accessToken: string | null = null;
let subscription: AuthSubscription | null = null;
let initialised = false;

export function aiFunctionUrl(): string {
  const base = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
  if (!base) return '';
  return `${base}/functions/v1/${FUNCTION_NAME}`;
}

export function isAiLinkReady(): boolean {
  return isSupabaseConfigured() && aiFunctionUrl().length > 0;
}

export function initAiClient(): void {
  if (initialised || !supabase) return;
  initialised = true;
  void refreshAiToken();
  subscription = supabase.auth.onAuthStateChange((_event, session) => {
    accessToken = session?.access_token ?? null;
  });
}

export function disposeAiClient(): void {
  subscription?.data.subscription.unsubscribe();
  subscription = null;
  accessToken = null;
  initialised = false;
}

export async function refreshAiToken(): Promise<string | null> {
  if (!supabase) {
    accessToken = null;
    return null;
  }
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    accessToken = data.session?.access_token ?? null;
  } catch {
    accessToken = null;
  }
  return accessToken;
}

function post(url: string, token: string, apiKey: string, body: string): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
      Authorization: `Bearer ${token}`,
    },
    body,
  });
}

export async function sendAiMessage(
  text: string,
  context?: AppChatContext
): Promise<string> {
  const url = aiFunctionUrl();
  if (!url) throw new Error('Quick-response mode is not configured yet.');

  const apiKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const payload = JSON.stringify({ deviceId: 'mobile', text, ...(context ? { context } : {}) });

  let token = accessToken ?? (await refreshAiToken());
  if (!token) throw new Error('Sign in to use the assistant.');

  let response: Response;
  try {
    response = await post(url, token, apiKey, payload);
    if (response.status === 401) {
      token = await refreshAiToken();
      if (!token) throw new Error('Your session expired. Sign in again.');
      response = await post(url, token, apiKey, payload);
    }
  } catch (e) {
    if (e instanceof Error && e.message === 'Your session expired. Sign in again.') throw e;
    throw new Error('Could not reach the assistant right now.');
  }

  if (response.status === 429) {
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message ?? "You've reached today's assistant limit.");
  }

  if (!response.ok) throw new Error('Could not reach the assistant right now.');

  const data = (await response.json().catch(() => null)) as { reply?: string } | null;
  return data?.reply?.trim() || 'Sorry, I could not process that.';
}
