import { ApiError } from './errors';
import { AgentMessageState, AgentStatus, AgentToolCall, DesktopConnection, ToolCallStatus } from './types';

const REQUEST_TIMEOUT_MS = 15000;
const HEALTH_TIMEOUT_MS = 8000;

function trimBase(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

export function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asStatus(value: unknown): ToolCallStatus {
  return value === 'running' || value === 'completed' || value === 'failed' ? value : 'completed';
}

function normalizeToolCall(raw: unknown): AgentToolCall | null {
  const r = asRecord(raw);
  const name = str(r.name) ?? str(r.tool);
  if (!name) return null;
  return {
    id: str(r.id),
    name,
    status: asStatus(r.status),
    params: r.params && typeof r.params === 'object' ? (r.params as Record<string, unknown>) : undefined,
    result: str(r.result) ?? str(r.error),
  };
}

export async function request<T>(
  conn: DesktopConnection,
  path: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${trimBase(conn.baseUrl)}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${conn.token}`,
      },
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(
      controller.signal.aborted ? 'timeout' : 'network',
      controller.signal.aborted
        ? 'The desktop took too long to respond.'
        : 'Could not reach your desktop. Check the URL and that it is online.'
    );
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 || res.status === 403) {
    throw new ApiError('auth', 'Your desktop rejected the API token.', res.status);
  }
  if (!res.ok) {
    throw new ApiError('server', `Desktop agent error (${res.status}).`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json().catch(() => ({}))) as T;
}

/** GET /api/v1/health/ready — throws ApiError when the desktop is unreachable/unauthorized. */
export async function checkReady(conn: DesktopConnection): Promise<void> {
  await request<unknown>(conn, '/api/v1/health/ready', { method: 'GET' }, HEALTH_TIMEOUT_MS);
}

/** GET /api/v1/agent/status */
export async function getAgentStatus(conn: DesktopConnection): Promise<AgentStatus> {
  const data = asRecord(await request<unknown>(conn, '/api/v1/agent/status', { method: 'GET' }, HEALTH_TIMEOUT_MS));
  return {
    active: data.active === true || data.ready === true || str(data.status) === 'active',
    provider: str(data.provider),
    model: str(data.model),
    currentTaskId: str(data.current_task_id) ?? str(data.currentTaskId),
  };
}

/** POST /api/v1/agent/message — returns the id to poll. */
export async function sendAgentMessage(
  conn: DesktopConnection,
  text: string,
  conversationId?: string
): Promise<string> {
  const data = asRecord(
    await request<unknown>(conn, '/api/v1/agent/message', {
      method: 'POST',
      body: JSON.stringify({
        message: text,
        ...(conversationId ? { conversation_id: conversationId } : {}),
      }),
    })
  );

  const id = str(data.id) ?? str(data.message_id) ?? str(data.task_id);
  if (!id) throw new ApiError('server', 'The desktop did not return a message id.');
  return id;
}

/** GET /api/v1/agent/messages/{id} — normalized, tolerant of snake/camel keys. */
export async function getAgentMessage(conn: DesktopConnection, id: string): Promise<AgentMessageState> {
  const data = asRecord(
    await request<unknown>(conn, `/api/v1/agent/messages/${encodeURIComponent(id)}`, { method: 'GET' })
  );

  const rawStatus = str(data.status);
  const status =
    rawStatus === 'pending' || rawStatus === 'running' || rawStatus === 'completed' || rawStatus === 'failed'
      ? rawStatus
      : 'completed';

  const rawToolCalls = Array.isArray(data.tool_calls)
    ? data.tool_calls
    : Array.isArray(data.toolCalls)
      ? data.toolCalls
      : [];

  return {
    id,
    status,
    text: str(data.message) ?? str(data.response) ?? str(data.text) ?? '',
    toolCalls: rawToolCalls
      .map(normalizeToolCall)
      .filter((call): call is AgentToolCall => call !== null),
    providerLabel: str(data.provider) ?? str(data.provider_label),
  };
}
