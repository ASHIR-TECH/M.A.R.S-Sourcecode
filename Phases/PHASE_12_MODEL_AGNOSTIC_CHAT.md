# Phase 12 — Model-Agnostic AI Chat (Multi-Provider Desktop + Fallback)

**Module:** `relay/` (protocol extension), `screens/Chat` (mobile UI additions), desktop agent (adapter pattern — spec only, desktop is out of this app's codebase but the contract lives here)
**Depends on:** Phase 6 (relay client, `chat_message`/`chat_response`), Phase 9 (Chat screen), Phase 5 (pairing — determines whether a desktop is even connected)

---

## 1. The core principle

**Mobile never knows which model answered.** It sends `chat_message`, it receives `chat_response`. Whether that response came from OpenAI, Claude, Ollama, or a future in-system base model is entirely the desktop's business. This phase formalizes that boundary and adds exactly one thing mobile *is* allowed to know: **which provider is currently active**, purely for display ("Answered via Claude") — never for behavior branching.

This means Phase 9's `ChatScreen.tsx` needs **zero code changes** for provider logic. The only addition is a small metadata field on the response and one optional UI label.

---

## 2. Two distinct chat contexts (this is the part that trips people up)

| Context | Who answers | Who pays | When it applies |
|---|---|---|---|
| **Paired chat** | Desktop's active adapter (OpenAI/Claude/Ollama/base model) | The user's own desktop — their own API keys, or free if Ollama/local | User has a desktop paired (Phase 5) and it's online |
| **Fallback chat** | Your embedded Groq-powered model | You, at Groq's free/low tier | No desktop paired, or paired desktop is offline/unreachable |

These are **not** the same feature wearing two hats — they're two different backends behind the identical `ChatScreen` UI. The screen doesn't care; the *relay client* decides which one is actually reachable and routes accordingly.

---

## 3. Requirements

### 3.1 Functional Requirements
| ID | Requirement |
|---|---|
| FR-1 | `chat_response` message gains an optional `providerLabel` field (e.g. `"Claude"`, `"Ollama (local)"`, `"OpenAI"`) purely for display |
| FR-2 | Chat screen shows the provider label as a small caption under the AI's message bubble, if present — omitted entirely if absent (fallback chat, or desktop chooses not to disclose) |
| FR-3 | If a paired desktop is offline/unreachable when a chat message is sent, the mobile app automatically routes that message to the fallback (Groq) chat instead, with a visible note ("Desktop unavailable — using quick-response mode") |
| FR-4 | Desktop agent exposes a provider adapter interface (spec'd here, implemented desktop-side) so OpenAI/Claude/Ollama/future base model are interchangeable without touching the relay protocol |
| FR-5 | Desktop can switch active provider (user preference on desktop) without any relay protocol version bump — the contract (`chat_message` in, `chat_response` out) never changes regardless of provider count |
| FR-6 | Fallback chat is rate-limited per device (e.g. 50 messages/day) since you're paying for it |

### 3.2 Non-Functional Requirements
| ID | Requirement |
|---|---|
| NFR-1 | Mobile app has zero conditional logic branching on provider identity — `providerLabel` is display-only, never used in any `if` statement that changes behavior |
| NFR-2 | Fallback routing decision (paired-and-online vs. fallback) lives in the relay client (Phase 6), not duplicated in the Chat screen |
| NFR-3 | Desktop-side adapter interface is documented here as the contract, even though its implementation is outside this mobile-focused codebase — this is the seam the desktop team/you must honor |

### 3.3 Out of Scope
- Desktop-side adapter *implementation* code (OpenAI/Claude/Ollama clients) — that's desktop app work, not this mobile repo
- Letting the mobile user pick which desktop-side provider to use per-message — that's a desktop settings concern, not mobile's

---

## 4. Desktop-side contract (spec, not this repo's code — but must be honored)

```ts
// Desktop agent's internal interface — implemented once per provider.
// This is the ENTIRE reason mobile can stay model-agnostic.
interface AiProviderAdapter {
  readonly label: string; // "OpenAI", "Claude", "Ollama (local)", "Base Model"
  sendPrompt(text: string, conversationHistory: ChatTurn[]): Promise<string>;
}

interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

// Desktop picks ONE active adapter (user's own settings, own keys where relevant).
// Whatever it returns gets wrapped into the outbound relay message unchanged:
{
  type: 'chat_response',
  sessionId: string,
  text: string,               // <- adapter's raw output
  timestamp: string,
  providerLabel?: string       // <- adapter.label, optional disclosure
}
```

**The desktop team's job (yours, presumably):** each of OpenAI/Claude/Ollama/future-base-model becomes one small adapter implementing `sendPrompt`. Swapping the active one is a desktop-local setting. The relay message shape above never changes no matter how many adapters exist.

---

## 5. File Structure (mobile side additions only)

```
src/
  relay/
    types.ts                          # MODIFIED: InboundChatResponse gains providerLabel
    useRelayConnection.ts              # MODIFIED: routes to fallback when desktop unreachable
    fallbackChatClient.ts               # NEW: Groq-backed fallback, separate from RelayClient
  store/
    useChatSessionStore.ts             # MODIFIED: stores providerLabel per message, and a `viaFallback` flag
  components/
    ProviderBadge.tsx                   # NEW: small caption under AI messages
```

---

## 6. Implementation

### 6.1 Extended relay types

```ts
// src/relay/types.ts (modification)
export interface InboundChatResponse {
  type: 'chat_response';
  sessionId: string;
  text: string;
  timestamp: string;
  providerLabel?: string; // display-only, never branched on
}
```

### 6.2 Fallback chat client (Groq)

Separate, deliberately dumb module — this is NOT a relay client, no reconnect/backoff complexity needed since it's a stateless request/response HTTP call, not a persistent socket.

```ts
// src/relay/fallbackChatClient.ts
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? ''; // your key, paid by you, not the user

// NOTE: for production, route this through YOUR backend instead of calling
// Groq directly from the mobile app — same reasoning as Phase 11's payment
// verification: a key embedded in the mobile bundle can be extracted and
// abused by anyone who decompiles the app. A thin backend proxy endpoint
// (`/fallback-chat`) that holds the real key server-side is the correct
// production setup; calling Groq directly from mobile is fine for early
// development only.

export async function sendFallbackMessage(text: string): Promise<string> {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen-2.5-32b', // swap freely — this is the one line that picks the model
      messages: [{ role: 'user', content: text }],
    }),
  });

  if (!response.ok) {
    throw new Error('Fallback chat request failed.');
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? 'Sorry, I could not process that.';
}
```

### 6.3 Routing logic in the relay connection hook

```ts
// src/relay/useRelayConnection.ts (relevant modification)
import { sendFallbackMessage } from './fallbackChatClient';
import { useConnectionStore } from '../store/useConnectionStore';
import { useChatSessionStore } from '../store/useChatSessionStore';

// ... existing useRelayConnection setup from Phase 6 ...

export function useRelayConnection() {
  // ...existing code...

  const sendChatMessage = async (sessionId: string, text: string) => {
    const isDesktopReachable = useConnectionStore.getState().status === 'connected';

    if (isDesktopReachable) {
      const sent = send({ type: 'chat_message', sessionId, text });
      if (sent) return; // response arrives async via existing onMessage handler
    }

    // Fallback path — desktop unpaired or unreachable.
    try {
      const replyText = await sendFallbackMessage(text);
      useChatSessionStore.getState().addAiMessage(sessionId, replyText, new Date().toISOString());
      useChatSessionStore.getState().markLastMessageAsFallback(sessionId);
    } catch {
      useChatSessionStore.getState().addAiMessage(
        sessionId,
        'Sorry, I could not reach any AI service right now. Please try again shortly.',
        new Date().toISOString()
      );
    }
  };

  return { send, sendChatMessage };
}
```

### 6.4 Chat session store additions

```ts
// src/store/useChatSessionStore.ts (additions to Phase 9's version)
interface ChatMessage {
  // ...existing fields from Phase 9...
  providerLabel?: string;
  viaFallback?: boolean;
}

interface ChatSessionState {
  // ...existing...
  markLastMessageAsFallback: (sessionId: string) => void;
  setProviderLabel: (messageId: string, label: string) => void;
}

// Inside the store implementation:
markLastMessageAsFallback: (sessionId) => {
  const messages = get().messages;
  const lastIndex = messages.map((m) => m.sessionId).lastIndexOf(sessionId);
  if (lastIndex === -1) return;
  const updated = [...messages];
  updated[lastIndex] = { ...updated[lastIndex], viaFallback: true };
  set({ messages: updated });
},

setProviderLabel: (messageId, label) => {
  set({
    messages: get().messages.map((m) => (m.id === messageId ? { ...m, providerLabel: label } : m)),
  });
},
```

> Wire `setProviderLabel` into the existing `onMessage` handler from Phase 6 wherever `chat_response.providerLabel` is present, alongside the existing `addAiMessage` call.

### 6.5 Provider badge (display-only UI)

```tsx
// src/components/ProviderBadge.tsx
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface ProviderBadgeProps {
  label?: string;
  viaFallback?: boolean;
}

export function ProviderBadge({ label, viaFallback }: ProviderBadgeProps) {
  if (!label && !viaFallback) return null;
  return (
    <Text style={styles.text}>
      {viaFallback ? 'Quick-response mode' : label}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { color: colors.textMuted, fontSize: 10, marginTop: 2, fontStyle: 'italic' },
});
```

Add `<ProviderBadge label={message.providerLabel} viaFallback={message.viaFallback} />` inside Phase 9's `ChatBubble.tsx`, under the timestamp — the only UI touch this phase makes to the existing Chat screen.

---

## 7. Testing

```ts
// src/relay/fallbackChatClient.test.ts
import { sendFallbackMessage } from './fallbackChatClient';

global.fetch = jest.fn();

describe('sendFallbackMessage', () => {
  it('returns the model reply text on success', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Hello there' } }] }),
    });
    const result = await sendFallbackMessage('hi');
    expect(result).toBe('Hello there');
  });

  it('throws when the request fails', async () => {
    (fetch as jest.Mock).mockResolvedValue({ ok: false });
    await expect(sendFallbackMessage('hi')).rejects.toThrow();
  });
});
```

**Manual QA checklist:**
- [ ] With desktop paired and online, sending a message uses the relay path, response shows the correct `providerLabel` beneath it (test by switching desktop's active adapter between Ollama/OpenAI/Claude and confirming label changes)
- [ ] With no desktop paired, sending a message silently routes to fallback, shows "Quick-response mode" label, no error shown to user
- [ ] With desktop paired but offline (kill the mock relay server mid-session), sending a message falls back automatically rather than hanging
- [ ] Fallback rate limit (once implemented server-side per NFR-6/§8) correctly blocks excess requests with a clear message, not a silent failure
- [ ] Switching desktop's active provider mid-session requires zero mobile app changes or restart

---

## 8. Rate limiting (required before production)

The `fallbackChatClient` as written calls Groq directly with an embedded key — acceptable for development only. For production:

1. Move the Groq call behind your existing backend (same backend introduced in Phase 11 for donation verification — reuse it)
2. Add a `/fallback-chat` route that: validates a per-device identifier (e.g. a stable install ID, not tied to auth since fallback should work even signed-out), checks a request count against a daily cap (e.g. Redis or a simple DB counter), calls Groq server-side with the real key, returns the response
3. Mobile's `fallbackChatClient.ts` then calls **your backend**, not Groq directly — mirrors exactly the pattern already established in Phase 11 (`donationApi.ts` calling your backend instead of Flutterwave directly for anything sensitive)

---

## 9. Acceptance Criteria (Definition of Done)

- [ ] Mobile `ChatScreen` requires zero provider-specific code — confirmed by testing against at least two different desktop-side adapters and seeing identical mobile behavior aside from the label
- [ ] Fallback routing triggers automatically and transparently when no desktop is reachable, with no user-facing error for this expected case
- [ ] `providerLabel` is treated as pure display data everywhere in the mobile codebase — no `if (providerLabel === 'OpenAI')` type branches exist
- [ ] Groq key (or whichever fallback provider is chosen) is moved behind a backend proxy before any production release — never shipped embedded in the mobile bundle for real users
- [ ] Rate limiting on fallback chat is enforced server-side, not client-side (a client-side-only limit is trivially bypassed)
- [ ] Desktop can add a 4th, 5th, Nth provider adapter with zero mobile app changes required
