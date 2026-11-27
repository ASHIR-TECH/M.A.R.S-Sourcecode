import { create } from 'zustand';
import { ChatPreview } from '../types/chat';
import { mockChats } from '../data/mockChats';

interface ChatState {
  chats: ChatPreview[];
  appendChatResponse: (sessionId: string, text: string, timestamp: string) => void;
}

function previewTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: mockChats, // TODO(backend): replace with live chat history in a later phase
  appendChatResponse: (sessionId, text, timestamp) => {
    const chats = get().chats;
    const existing = chats.find((c) => c.id === sessionId);
    if (existing) {
      set({
        chats: chats.map((c) =>
          c.id === sessionId ? { ...c, lastMessage: text, timestamp: previewTime(timestamp) } : c
        ),
      });
      return;
    }
    // Home's "Recent Chats" used to stay empty forever because only updates to
    // a pre-existing row were handled. Create the row on the first reply.
    set({
      chats: [
        {
          id: sessionId,
          name: 'ADTP AI',
          initials: 'AI',
          lastMessage: text,
          timestamp: previewTime(timestamp),
          unreadCount: 0,
        },
        ...chats,
      ],
    });
  },
}));
