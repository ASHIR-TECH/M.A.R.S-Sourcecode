import { apiFetch, encodePathParam } from './client';
import type {
  AgentMessage,
  AgentMessageResponse,
  AgentStatus,
  DeviceTokenRequest,
} from './types';

/** GET /api/v1/agent/status */
export function getAgentStatus(): Promise<AgentStatus> {
  return apiFetch<AgentStatus>('/api/v1/agent/status');
}

/** POST /api/v1/agent/message — returns the created message id. */
export function sendAgentMessage(message: string, conversationId?: string): Promise<AgentMessageResponse> {
  return apiFetch<AgentMessageResponse>('/api/v1/agent/message', {
    method: 'POST',
    body: JSON.stringify({ message, conversation_id: conversationId }),
  });
}

/** GET /api/v1/agent/messages/{id} — polled by usePollAgent. */
export function getAgentMessage(id: string): Promise<AgentMessage> {
  return apiFetch<AgentMessage>(`/api/v1/agent/messages/${encodePathParam(id)}`);
}

/** POST /api/v1/agent/device-token — register this device for push. */
export function registerDeviceToken(body: DeviceTokenRequest): Promise<{ status: string }> {
  return apiFetch<{ status: string }>('/api/v1/agent/device-token', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** DELETE /api/v1/agent/device-token/{device_name} — deregister push. */
export function deregisterDeviceToken(deviceName: string): Promise<void> {
  return apiFetch<void>(`/api/v1/agent/device-token/${encodePathParam(deviceName)}`, {
    method: 'DELETE',
  });
}
