import { getInstallId } from './deviceId';
import type { AppChatContext } from './appContext';

function backendUrl(): string {
  return process.env.EXPO_PUBLIC_BACKEND_URL ?? '';
}

/**
 * Stateless fallback chat client (PHASE_12 §6.2 / §8).
 *
 * This is NOT a relay client — no socket, no reconnect/backoff. It calls our
 * own backend proxy, which holds the real Groq key and enforces the per-device
 * daily cap server-side. Calling Groq directly with a key embedded in the app
 * bundle would let anyone decompile the app and abuse it, so the proxy is the
 * production path from the start.
 */
export async function sendFallbackMessage(
  text: string,
  context?: AppChatContext
): Promise<string> {
  const baseUrl = backendUrl();
  if (!baseUrl) {
    throw new Error('Quick-response mode is not configured yet.');
  }

  const deviceId = await getInstallId();

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/fallback-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, text, ...(context ? { context } : {}) }),
    });
  } catch {
    throw new Error('Could not reach the assistant right now.');
  }

  if (response.status === 429) {
    const data = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(data?.message ?? "You've reached today's quick-response limit.");
  }

  if (!response.ok) {
    throw new Error('Could not reach the assistant right now.');
  }

  const data = (await response.json()) as { reply?: string };
  return data.reply?.trim() || 'Sorry, I could not process that.';
}
