import { create } from 'zustand';
import { ChatAttachment, ChatMessage } from '../types/chatMessage';
import { AgentToolCall, TransferReference } from '../desktop/types';

interface AiMessageMeta {
  providerLabel?: string;
  viaFallback?: boolean;
  toolCalls?: AgentToolCall[];
  transfers?: TransferReference[];
}

// Monotonic suffix so two messages created in the same millisecond (e.g. a
// user message immediately followed by a fallback reply) never share an id.
let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

interface ChatSessionState {
  messages: ChatMessage[];
  isAwaitingResponse: boolean;
  addUserMessage: (text: string, sessionId: string, attachment?: ChatAttachment) => ChatMessage;
  markSent: (id: string) => void;
  addAiMessage: (sessionId: string, text: string, timestamp: string, meta?: AiMessageMeta) => ChatMessage;
  /** Flags the newest message for a session as a quick-response fallback (PHASE_12 §6.4). */
  markLastMessageAsFallback: (sessionId: string) => void;
  /** Attaches a desktop adapter label to a specific AI message for display only. */
  setProviderLabel: (messageId: string, label: string) => void;
}

export const useChatSessionStore = create<ChatSessionState>((set, get) => ({
  messages: [
    { id: 'ai-greet', sessionId: 'default-session', sender: 'ai', text: 'What do you want to inquire?', timestamp: new Date().toISOString(), typing: true },
  ],
  isAwaitingResponse: false,

  addUserMessage: (text, sessionId, attachment) => {
    const message: ChatMessage = {
      id: nextId('local'),
      sessionId,
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
      status: 'sending',
      attachment,
    };
    set({ messages: [...get().messages, message], isAwaitingResponse: true });
    return message;
  },

  markSent: (id) => {
    set({
      messages: get().messages.map((m) => (m.id === id ? { ...m, status: 'sent' } : m)),
    });
  },

  addAiMessage: (sessionId, text, timestamp, meta) => {
    const message: ChatMessage = {
      id: nextId('ai'),
      sessionId,
      sender: 'ai',
      text,
      timestamp,
      typing: true,
      ...meta,
    };
    set({ messages: [...get().messages, message], isAwaitingResponse: false });
    return message;
  },

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
}));
