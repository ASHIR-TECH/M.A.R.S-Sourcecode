export interface ChatMessage {
  id: string;
  sessionId: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'failed';
}
