export interface ChatAttachment {
  name: string;
  mimeType?: string;
  size?: number;
  uri?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'failed';
  /** file attached to a user message, rendered as a card with a link icon */
  attachment?: ChatAttachment;
  /** when true, the AI message is revealed letter-by-letter with a typewriter effect */
  typing?: boolean;
  /** display-only desktop adapter that answered (PHASE_12). Never branch on this. */
  providerLabel?: string;
  /** true when the reply came from quick-response fallback rather than a paired desktop */
  viaFallback?: boolean;
}
