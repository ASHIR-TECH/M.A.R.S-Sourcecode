import { AgentToolCall, TransferReference } from '../desktop/types';
import type { MediaRef } from '../media/types';

export interface ChatAttachment {
  name: string;
  mimeType?: string;
  size?: number;
  /** local file URI before upload; cleared once media is stored in the blob */
  uri?: string;
  /** filled in after compression + upload; carries thumbnail/download URLs */
  media?: MediaRef;
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
  /** Tool calls the desktop agent executed while answering (PHASE_14). */
  toolCalls?: AgentToolCall[];
  /** File transfers the reply references, rendered as file tiles (PHASE_14 §Chat). */
  transfers?: TransferReference[];
  /**
   * Media sent with an AI/ADTP message. Bytes live in Upstash Blob; this is
   * only metadata, so it survives the 10-minute signed-URL expiry.
   */
  media?: MediaRef;
}
