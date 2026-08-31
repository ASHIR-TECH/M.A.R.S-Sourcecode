import { Device } from '../types/device';

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
}

export type OutboundMessage = OutboundCommandMessage | OutboundChatMessage;

export interface InboundStateUpdate {
  type: 'state_update';
  devices: Device[];
}

export interface InboundChatResponse {
  type: 'chat_response';
  sessionId: string;
  text: string;
  timestamp: string;
}

export interface InboundAuthAck {
  type: 'auth_ack';
}

export interface InboundAuthRejected {
  type: 'auth_rejected';
  reason: string;
}

export type InboundMessage =
  | InboundStateUpdate
  | InboundChatResponse
  | InboundAuthAck
  | InboundAuthRejected;

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'auth_failed'
  | 'error';
