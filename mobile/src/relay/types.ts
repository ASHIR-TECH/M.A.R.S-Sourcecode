import { Device } from '../types/device';
import { AgentToolCall } from '../desktop/types';

export interface OutboundCommandMessage {
  type: 'command';
  nodeId: string;
  action: string;
  params?: Record<string, unknown>;
}

export interface OutboundChatMessage {
  type: 'chat_message';
  sessionId: string;
  text: string;
  /** Absolute desktop paths the phone uploaded with this message. */
  attachments?: string[];
}

export type OutboundMessage =
  | OutboundCommandMessage
  | OutboundChatMessage
  | { type: 'ping' }
  | { type: 'pong' };

export interface InboundStateUpdate {
  type: 'state_update';
  devices: Device[];
}

export interface InboundChatResponse {
  type: 'chat_response';
  sessionId: string;
  text: string;
  timestamp: string;
  /**
   * Display-only. Names whichever desktop-side AI adapter answered (e.g.
   * "Claude", "Ollama (local)"). Never branch behaviour on this value
   * (PHASE_12 NFR-1); omit it and the UI simply shows no label.
   */
  providerLabel?: string;
  /**
   * Tool invocations the desktop agent performed while answering. Files sent
   * to this phone carry their inbox id, so the reply can render a download
   * tile instead of only text.
   */
  toolCalls?: AgentToolCall[];
}

export interface InboundAuthAck {
  type: 'auth_ack';
}

export interface InboundAuthRejected {
  type: 'auth_rejected';
  reason: string;
}

/** Desktop → phone text pushed over the live relay (durable REST fallback). */
export interface InboundDeviceMessage {
  type: 'device_message';
  message: {
    id: string;
    device_id: string;
    text: string;
    created_at: string;
    delivered_at?: string | null;
  };
}

export interface InboundControl {
  type: 'ping' | 'pong';
  timestamp?: string;
}

export type InboundMessage =
  | InboundStateUpdate
  | InboundChatResponse
  | InboundAuthAck
  | InboundAuthRejected
  | InboundDeviceMessage
  | InboundControl;

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'auth_failed'
  | 'error';
