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
