import { getToken, getApiUrl, clearAll } from '@/lib/storage';

export type AppError = {
  code: 'NETWORK' | 'AUTH' | 'SERVER' | 'UNKNOWN';
  message: string;
  status?: number;
};

function mapError(err: unknown, status?: number): AppError {
  if (status === 401) {
    return { code: 'AUTH', message: 'Session expired', status };
  }
  if (status && status >= 500) {
    return { code: 'SERVER', message: `Server error (${status})`, status };
  }
  if (err instanceof TypeError && err.message.includes('Network')) {
    return { code: 'NETWORK', message: 'No connection' };
  }
  return { code: 'UNKNOWN', message: String(err) };
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T; error: null } | { data: null; error: AppError }> {
  try {
    const [token, baseUrl] = await Promise.all([getToken(), getApiUrl()]);

    if (!token || !baseUrl) {
      return { data: null, error: { code: 'AUTH', message: 'Not authenticated' } };
    }

    const url = `${baseUrl.replace(/\/+$/, '')}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (res.status === 401) {
      await clearAll();
      return { data: null, error: { code: 'AUTH', message: 'Session expired', status: 401 } };
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { data: null, error: mapError(text || res.statusText, res.status) };
    }

    const data = await res.json() as T;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: mapError(err) };
  }
}

export type Session = {
  peer_id: string;
  peer_name: string;
  nat_type: string;
  connection_path: string;
  connected_at: string;
  last_active: string;
};

export type AgentMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

export type AgentStatus = {
  status: 'idle' | 'thinking' | 'executing';
  provider: string;
  model: string;
};

export type Transfer = {
  id: string;
  filename: string;
  sender_peer_id: string;
  receiver_peer_id: string;
  size_bytes: number;
  status: string;
  created_at: string;
};

export async function getSessions() {
  return apiFetch<Session[]>('/api/v1/sessions');
}

export async function getAgentStatus() {
  return apiFetch<AgentStatus>('/api/v1/agent/status');
}

export async function sendMessage(content: string) {
  return apiFetch<{ id: string; content: string; timestamp: string }>(
    '/api/v1/agent/message',
    {
      method: 'POST',
      body: JSON.stringify({ content }),
    },
  );
}

export async function getMessages(sessionId: string) {
  return apiFetch<AgentMessage[]>(`/api/v1/agent/messages/${sessionId}`);
}

export async function getTransfers() {
  return apiFetch<Transfer[]>('/api/v1/transfers');
}

export async function healthCheck() {
  return apiFetch<{ status: string }>('/api/v1/health/ready');
}

export async function registerDeviceToken(expoPushToken: string, deviceName: string) {
  return apiFetch<{ ok: boolean }>('/api/v1/agent/device-token', {
    method: 'POST',
    body: JSON.stringify({ expo_push_token: expoPushToken, device_name: deviceName }),
  });
}
