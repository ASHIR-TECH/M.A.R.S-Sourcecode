import { create } from 'zustand';
import { ChatPreview } from '../types/chat';
import { mockChats } from '../data/mockChats';

interface ChatState {
  chats: ChatPreview[];
  appendChatResponse: (sessionId: string, text: string, timestamp: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: mockChats, // TODO(backend): replace with live chat history in a later phase
  appendChatResponse: (sessionId, text, timestamp) => {
    // Minimal v1: update matching session's preview row (PHASE_6 §5.4).
    // Full message-thread storage belongs to the AI Chat screen's own phase.
    set({
      chats: get().chats.map((c) =>
        c.id === sessionId ? { ...c, lastMessage: text, timestamp } : c
      ),
    });
  },
}));
