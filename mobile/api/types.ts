/**
 * TypeScript mirrors of the Phase 4 REST API (adtp-api) response shapes.
 * Field names follow the FastAPI/Pydantic models returned by the desktop peer.
 */

export type Direction = 'sent' | 'received';

export type TransferStatus =
  | 'Pending'
  | 'InProgress'
  | 'Delivered'
  | 'Failed'
  | 'Cancelled'
  | 'Verified'
  | 'Alerted';

export type PathType =
  | 'direct_ipv4'
  | 'direct_ipv6'
  | 'lan'
  | 'hole_punch'
  | 'relay'
  | 'qowt';

/** GET /api/v1/health */
export interface HealthStatus {
  status: string;
  version?: string;
  peer_id?: string;
  /** First peer id returned by health; used for the Peers screen. */
  agent_active?: boolean;
  nat_type?: string;
}

/** GET /api/v1/agent/status */
export interface AgentStatus {
  status: 'active' | 'inactive' | 'unknown';
  provider?: string;
  model?: string;
  system_prompt?: string;
}

/** POST /api/v1/agent/message */
export interface AgentMessageRequest {
  message: string;
  conversation_id?: string;
}

export interface ToolCallStep {
  tool_name: string;
  params: Record<string, unknown>;
  result_summary?: string;
  status: 'running' | 'completed' | 'failed';
}

export interface FileRef {
  filename: string;
  size?: number;
  peer?: string;
  transfer_id?: string;
  url?: string;
}

export type AgentMessageStatus = 'pending' | 'running' | 'completed' | 'failed';

/** GET /api/v1/agent/messages/{id} */
export interface AgentMessage {
  id: string;
  status: AgentMessageStatus;
  message?: string;
  error?: string;
  tool_calls?: ToolCallStep[];
  file_refs?: FileRef[];
  conversation_id?: string;
  created_at?: string;
  completed_at?: string;
}

/** POST /api/v1/agent/message response */
export interface AgentMessageResponse {
  id: string;
}

export interface TransferProgress {
  bytes_sent: number;
  total_bytes: number;
}

/** GET /api/v1/transfers item */
export interface Transfer {
  id: string;
  filename: string;
  direction: Direction;
  peer: string;
  size: number;
  status: TransferStatus;
  timestamp: string;
  content_hash?: string;
  integrity_ok?: boolean;
  progress?: TransferProgress;
}

/** Phase 3 context block attached to a transfer. */
export interface ContextBlock {
  schema?: Record<string, unknown>;
  agent_hint?: string;
  summary?: string;
}

/** GET /api/v1/transfers/{id} — full transfer detail incl. context + audit. */
export interface TransferDetail extends Transfer {
  context?: ContextBlock;
  signature?: string;
  chain_hash?: string;
}

/** GET /api/v1/transfers/{id}/status */
export interface TransferStatusResponse {
  id: string;
  status: TransferStatus;
  progress?: TransferProgress;
}

/** GET /api/v1/sessions item */
export interface Session {
  peer_id: string;
  nickname?: string;
  peer_addr?: string;
  path_type?: PathType;
  connected_at: string;
  transfer_count?: number;
}

/** GET /api/v1/audit item */
export interface AuditEntry {
  id: string;
  transfer_id?: string;
  filename?: string;
  direction?: Direction;
  peer?: string;
  timestamp: string;
  status?: TransferStatus;
  chain_hash?: string;
  signature?: string;
  integrity_ok?: boolean;
}

/** POST /api/v1/agent/device-token body */
export interface DeviceTokenRequest {
  expo_push_token: string;
  device_name: string;
}
