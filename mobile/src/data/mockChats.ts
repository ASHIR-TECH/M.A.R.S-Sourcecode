import { ChatPreview } from '../types/chat';

export const mockChats: ChatPreview[] = [
  {
    id: 'chat-nova-core',
    name: 'Nova Core',
    initials: 'NC',
    lastMessage: 'Alert: Node CPU spike detected…',
    timestamp: '14:02',
    unreadCount: 1,
  },
  {
    id: 'chat-helix',
    name: 'Helix (Lead Dev)',
    initials: 'HX',
    lastMessage: 'The local sync command compl…',
    timestamp: 'Yesterday',
    unreadCount: 0,
  },
];
