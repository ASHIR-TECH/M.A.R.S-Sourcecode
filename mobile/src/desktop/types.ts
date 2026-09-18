export interface DesktopConnection {
  /** Base URL of the desktop peer's Phase 4 REST API, e.g. https://10.0.2.2:40003 */
  baseUrl: string;
  /** ADTP_API_TOKEN — sent as Authorization: Bearer <token>. */
  token: string;
  /** How the connection was set: QR scan or manual settings entry. */
  origin?: 'qr' | 'manual';
}

export type AgentMessageStatus = 'pending' | 'running' | 'completed' | 'failed';

export type ToolCallStatus = 'running' | 'completed' | 'failed';

/** One tool invocation the desktop's embedded agent made (send_file, list_peers…). */
export interface AgentToolCall {
  id?: string;
  name: string;
  status: ToolCallStatus;
  params?: Record<string, unknown>;
  result?: string;
}

/** Normalized state of a single agent message, polled until terminal. */
export interface AgentMessageState {
  id: string;
  status: AgentMessageStatus;
  text: string;
  toolCalls: AgentToolCall[];
  providerLabel?: string;
}

export interface AgentStatus {
  active: boolean;
  provider?: string;
  model?: string;
  currentTaskId?: string;
}
