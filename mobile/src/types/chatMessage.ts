export interface ChatMessage {
  id: string;
  sessionId: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'failed';
  /** when true, the AI message is revealed letter-by-letter with a typewriter effect */
  typing?: boolean;
}
