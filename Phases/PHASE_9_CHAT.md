# Phase 9 — AI Chat (Co-Pilot) Screen

**Module:** `screens/Chat`
**Depends on:** Phase 6 (relay — `chat_message`/`chat_response`), Phase 4 (Chat tab + FAB parity target)

---

## 1. Requirements

| ID | Requirement |
|---|---|
| FR-1 | Header: logo, "COMMAND CENTER" label, system status indicator ("SYSTEM STATUS: OK") |
| FR-2 | Scrollable message thread: AI messages left-aligned in a card, user messages right-aligned in a bubble, each with timestamp |
| FR-3 | Input bar pinned to bottom: text field ("Ask Co-Pilot about node statuses…") + send button |
| FR-4 | Sending a message appends it optimistically to the thread, then sends via `useRelayConnection().send({ type: 'chat_message', ... })` |
| FR-5 | Incoming `chat_response` messages append to the same session's thread |
| FR-6 | While awaiting a response, show a typing/thinking indicator |
| FR-7 | Message list auto-scrolls to bottom on new message, but not while the user has manually scrolled up to read history |

## 2. Design Decisions

- **Session-scoped thread store** (`useChatSessionStore`), separate from Phase 3's `useChatStore` (which only holds *preview* rows for Home). This screen owns full message history; Home's preview list is updated via Phase 6's existing `appendChatResponse`.
- **Optimistic send** — the user's own message renders instantly (status: `sending` → `sent`) rather than waiting on a round trip, standard chat-UX practice (matches WhatsApp/iMessage/Slack conventions — Jakob's Law again).

## 3. File Structure

```
src/
  types/chatMessage.ts
  store/useChatSessionStore.ts
  components/ChatBubble.tsx
  components/TypingIndicator.tsx
  screens/Chat/ChatScreen.tsx
  screens/Chat/ChatScreen.styles.ts
```

## 4. Implementation

```ts
// src/types/chatMessage.ts
export interface ChatMessage {
  id: string;
  sessionId: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'failed';
}
```

```ts
// src/store/useChatSessionStore.ts
import { create } from 'zustand';
import { ChatMessage } from '../types/chatMessage';

interface ChatSessionState {
  messages: ChatMessage[];
  isAwaitingResponse: boolean;
  addUserMessage: (text: string, sessionId: string) => ChatMessage;
  markSent: (id: string) => void;
  addAiMessage: (sessionId: string, text: string, timestamp: string) => void;
}

export const useChatSessionStore = create<ChatSessionState>((set, get) => ({
  messages: [],
  isAwaitingResponse: false,

  addUserMessage: (text, sessionId) => {
    const message: ChatMessage = {
      id: `local-${Date.now()}`,
      sessionId,
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
      status: 'sending',
    };
    set({ messages: [...get().messages, message], isAwaitingResponse: true });
    return message;
  },

  markSent: (id) => {
    set({
      messages: get().messages.map((m) => (m.id === id ? { ...m, status: 'sent' } : m)),
    });
  },

  addAiMessage: (sessionId, text, timestamp) => {
    set({
      messages: [
        ...get().messages,
        { id: `ai-${Date.now()}`, sessionId, sender: 'ai', text, timestamp },
      ],
      isAwaitingResponse: false,
    });
  },
}));
```

```tsx
// src/components/ChatBubble.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChatMessage } from '../types/chatMessage';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.sender === 'user';
  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
        <Text style={styles.text}>{message.text}</Text>
        <Text style={styles.timestamp}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.md, marginVertical: spacing.xs, alignItems: 'flex-start' },
  rowUser: { alignItems: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: 14, padding: spacing.sm },
  bubbleAi: { backgroundColor: 'rgba(255,255,255,0.06)' },
  bubbleUser: { backgroundColor: colors.accent },
  text: { color: colors.textPrimary, fontSize: 14 },
  timestamp: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
});
```

```tsx
// src/components/TypingIndicator.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export function TypingIndicator() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Co-Pilot is thinking…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  text: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic' },
});
```

```tsx
// src/screens/Chat/ChatScreen.tsx
import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, FlatList } from 'react-native';
import { useChatSessionStore } from '../../store/useChatSessionStore';
import { useRelayConnection } from '../../relay/useRelayConnection';
import { ChatBubble } from '../../components/ChatBubble';
import { TypingIndicator } from '../../components/TypingIndicator';
import { styles } from './ChatScreen.styles';

const SESSION_ID = 'default-session'; // multi-session support deferred

export function ChatScreen() {
  const { messages, isAwaitingResponse, addUserMessage, markSent } = useChatSessionStore();
  const { send } = useRelayConnection();
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList>(null);

  const handleSend = () => {
    if (!draft.trim()) return;
    const message = addUserMessage(draft.trim(), SESSION_ID);
    const sent = send({ type: 'chat_message', sessionId: SESSION_ID, text: message.text });
    if (sent) markSent(message.id);
    setDraft('');
    listRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>MARS AI CO-PILOT</Text>
        <Text style={styles.status}>SYSTEM STATUS: OK</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <ChatBubble message={item} />}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={isAwaitingResponse ? <TypingIndicator /> : null}
      />

      <View style={styles.inputBar}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask Co-Pilot about node statuses…"
          placeholderTextColor="#8A7A68"
          style={styles.input}
          onSubmitEditing={handleSend}
        />
        <Pressable onPress={handleSend} style={styles.sendButton} accessibilityLabel="Send message">
          <Text style={styles.sendIcon}>{'➤'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
```

```ts
// src/screens/Chat/ChatScreen.styles.ts
import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  title: { color: colors.textPrimary, fontWeight: '700', fontSize: 13, letterSpacing: 1 },
  status: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: { color: '#0B0704', fontSize: 16 },
});
```

**Wiring note:** connect `useRelayConnection`'s inbound `chat_response` handling (already built in Phase 6's `useRelayConnection`) to also call `useChatSessionStore().addAiMessage(...)` alongside the existing `useChatStore().appendChatResponse(...)` call, so the full thread and the Home preview row both update from the same inbound event.

## 5. Testing

```ts
// src/store/useChatSessionStore.test.ts
import { useChatSessionStore } from './useChatSessionStore';

describe('useChatSessionStore', () => {
  beforeEach(() => useChatSessionStore.setState({ messages: [], isAwaitingResponse: false }));

  it('adds a user message optimistically with sending status', () => {
    const msg = useChatSessionStore.getState().addUserMessage('hello', 's1');
    expect(msg.status).toBe('sending');
    expect(useChatSessionStore.getState().isAwaitingResponse).toBe(true);
  });

  it('marks a message sent', () => {
    const msg = useChatSessionStore.getState().addUserMessage('hi', 's1');
    useChatSessionStore.getState().markSent(msg.id);
    const updated = useChatSessionStore.getState().messages.find((m) => m.id === msg.id);
    expect(updated?.status).toBe('sent');
  });

  it('adds an AI message and clears awaiting flag', () => {
    useChatSessionStore.getState().addUserMessage('hi', 's1');
    useChatSessionStore.getState().addAiMessage('s1', 'Hello!', new Date().toISOString());
    expect(useChatSessionStore.getState().isAwaitingResponse).toBe(false);
  });
});
```

## 6. Acceptance Criteria

- [ ] Matches Figma `mars-ai-chat` layout
- [ ] Messages send optimistically and reconcile on relay response
- [ ] Typing indicator shows only while awaiting a response
- [ ] Auto-scroll doesn't fight a user who's scrolled up to read history
- [ ] Reuses Phase 6's relay connection — no second WebSocket instance
