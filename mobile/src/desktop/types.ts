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

export type TransferDirection = 'incoming' | 'outgoing';

export type TransferStatus =
  | 'queued'
  | 'negotiating'
  | 'transferring'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** A file transfer the desktop peer executed (Phase 4 /transfers). */
export interface TransferRecord {
  id: string;
  fileName: string;
  sizeBytes?: number;
  direction: TransferDirection;
  status: TransferStatus;
  peerId: string;
  peerName?: string;
  startedAt?: string;
  completedAt?: string;
  /** 0..1 */
  progress: number;
}

/** A live/visible peer connection (Phase 4 /sessions). */
export interface SessionRecord {
  id: string;
  peerId: string;
  peerName?: string;
  connectedAt: string;
  lastActivityAt?: string;
  transferCount?: number;
  bytesTransferred?: number;
}

/** A watched folder relaying incoming files (Phase 4 /watchers). */
export interface WatcherRecord {
  path: string;
  peerId?: string;
  peerName?: string;
  active: boolean;
}

/** A transfer referenced by an agent reply, rendered as a file tile. */
export interface TransferReference {
  fileName: string;
  direction: TransferDirection;
  peerName?: string;
  sizeBytes?: number;
  result?: string;
}
