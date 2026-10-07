export interface DevicePresence {
  deviceId: string;
  lastSeen: number;
  ago: number;
}

export async function pingPresence(baseUrl: string, deviceId: string, token?: string): Promise<void> {
  try {
    await fetch(`${baseUrl.replace(/\/$/, '')}/devices/presence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ deviceId }),
    });
  } catch (e) {
    // ignore presence ping failures
  }
}

export async function getPresence(baseUrl: string, token?: string): Promise<DevicePresence[]> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/devices/presence`, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.devices) ? data.devices : [];
  } catch (e) {
    return [];
  }
}
