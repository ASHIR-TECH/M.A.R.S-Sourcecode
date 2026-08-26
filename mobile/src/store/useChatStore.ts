import { create } from 'zustand';
import { ChatPreview } from '../types/chat';
import { mockChats } from '../data/mockChats';

interface ChatState {
  chats: ChatPreview[];
}

export const useChatStore = create<ChatState>(() => ({
  chats: mockChats, // TODO(backend): replace with live chat history in a later phase
}));
