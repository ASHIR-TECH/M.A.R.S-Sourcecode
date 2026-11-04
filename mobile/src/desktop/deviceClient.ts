import * as Battery from 'expo-battery';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getInstallId } from '../relay/deviceId';
import { asRecord, request, str } from './agentClient';
import { DesktopConnection } from './types';

const TIMEOUT_MS = 8000;

export interface PairedDeviceRecord {
  deviceId: string;
  name: string;
  platform: string;
  osName: string;
  osVersion: string;
  appVersion: string;
  model: string;
  batteryPercent?: number;
  batteryCharging?: boolean;
  online: boolean;
  lastSeen: string;
}

export interface DeviceRegistration {
  device_id: string;
  name: string;
  platform: string;
  os_name: string;
  os_version: string;
  app_version: string;
  model: string;
  battery_percent?: number;
  battery_charging?: boolean;
  capabilities: string[];
}

export interface InboxFile {
  id: string;
  deviceId: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  sha256: string;
  createdAt: string;
}

export interface DeviceMessage {
  id: string;
  deviceId: string;
  text: string;
  createdAt: string;
  deliveredAt?: string | null;
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function boolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

/** Best-effort phone identity: a failed telemetry read must never block pairing. */
export async function buildRegistration(): Promise<DeviceRegistration> {
  let batteryPercent: number | undefined;
  let batteryCharging: boolean | undefined;
  try {
    const level = await Battery.getBatteryLevelAsync();
    if (level >= 0) batteryPercent = Math.round(level * 100);
    const state = await Battery.getBatteryStateAsync();
    batteryCharging = state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL;
  } catch {
    // Battery is optional (embeddable devices, simulators, web).
  }

  return {
    device_id: await getInstallId(),
    name: Device.deviceName || `${Platform.OS} phone`,
    platform: Platform.OS,
    os_name: Device.osName || Platform.OS,
    os_version: Device.osVersion || String(Platform.Version ?? ''),
    app_version: Constants.expoConfig?.version ?? '1.0.0',
    model: Device.modelName || '',
    ...(batteryPercent !== undefined ? { battery_percent: batteryPercent } : {}),
    ...(batteryCharging !== undefined ? { battery_charging: batteryCharging } : {}),
    capabilities: ['chat', 'files', 'system-info'],
  };
}

/** POST /api/v1/devices/register — makes this phone visible on the desktop. */
export async function registerDevice(conn: DesktopConnection): Promise<PairedDeviceRecord> {
  const body = await buildRegistration();
  const raw = await request<unknown>(
    conn,
    '/api/v1/devices/register',
    { method: 'POST', body: JSON.stringify(body) },
    TIMEOUT_MS
  );
  const record = asRecord(asRecord(raw).device);
  return normalizeDevice(record, body);
}

/** POST /api/v1/devices/{id}/heartbeat — keeps the device "online" + telemetry fresh. */
export async function sendHeartbeat(conn: DesktopConnection): Promise<void> {
  const body = await buildRegistration();
  await request<unknown>(
    conn,
    `/api/v1/devices/${encodeURIComponent(body.device_id)}/heartbeat`,
    {
      method: 'POST',
      body: JSON.stringify({
        name: body.name,
        platform: body.platform,
        os_name: body.os_name,
        os_version: body.os_version,
        app_version: body.app_version,
        model: body.model,
        battery_percent: body.battery_percent,
        battery_charging: body.battery_charging,
        capabilities: body.capabilities,
      }),
    },
    TIMEOUT_MS
  );
}

/** Heartbeat if the desktop already knows this phone; otherwise register it. */
export async function ensureRegistered(conn: DesktopConnection): Promise<void> {
  try {
    await sendHeartbeat(conn);
  } catch {
    await registerDevice(conn);
  }
}

/** GET /api/v1/devices/{id}/files — files the desktop staged for this phone. */
export async function listInbox(conn: DesktopConnection): Promise<InboxFile[]> {
  const deviceId = await getInstallId();
  const raw = asRecord(
    await request<unknown>(
      conn,
      `/api/v1/devices/${encodeURIComponent(deviceId)}/files`,
      { method: 'GET' },
      TIMEOUT_MS
    )
  );
  const files = Array.isArray(raw.files) ? raw.files : [];
  return files
    .map((entry) => {
      const r = asRecord(entry);
      const id = str(r.id);
      const filename = str(r.filename);
      if (!id || !filename) return null;
      return {
        id,
        deviceId: str(r.device_id) ?? deviceId,
        filename,
        fileSize: num(r.file_size) ?? 0,
        mimeType: str(r.mime_type) ?? 'application/octet-stream',
        sha256: str(r.sha256) ?? '',
        createdAt: str(r.created_at) ?? new Date().toISOString(),
      } satisfies InboxFile;
    })
    .filter((file): file is InboxFile => file !== null);
}

/** GET /api/v1/devices/{id}/messages — durable desktop → phone messages. */
export async function listMessages(conn: DesktopConnection): Promise<DeviceMessage[]> {
  const deviceId = await getInstallId();
  const raw = asRecord(
    await request<unknown>(
      conn,
      `/api/v1/devices/${encodeURIComponent(deviceId)}/messages`,
      { method: 'GET' },
      TIMEOUT_MS
    )
  );
  const messages = Array.isArray(raw.messages) ? raw.messages : [];
  return messages
    .map((entry): DeviceMessage | null => {
      const r = asRecord(entry);
      const id = str(r.id);
      const text = str(r.text);
      if (!id || !text) return null;
      return {
        id,
        deviceId: str(r.device_id) ?? deviceId,
        text,
        createdAt: str(r.created_at) ?? new Date().toISOString(),
        deliveredAt: typeof r.delivered_at === 'string' ? r.delivered_at : null,
      };
    })
    .filter((message): message is DeviceMessage => message !== null);
}

/** POST /api/v1/devices/{id}/messages/{message_id}/delivered */
export async function markMessageDelivered(
  conn: DesktopConnection,
  messageId: string
): Promise<void> {
  const deviceId = await getInstallId();
  await request<unknown>(
    conn,
    `/api/v1/devices/${encodeURIComponent(deviceId)}/messages/${encodeURIComponent(messageId)}/delivered`,
    { method: 'POST' },
    TIMEOUT_MS
  );
}

function normalizeDevice(
  raw: Record<string, unknown>,
  fallback: DeviceRegistration
): PairedDeviceRecord {
  return {
    deviceId: str(raw.device_id) ?? fallback.device_id,
    name: str(raw.name) ?? fallback.name,
    platform: str(raw.platform) ?? fallback.platform,
    osName: str(raw.os_name) ?? fallback.os_name,
    osVersion: str(raw.os_version) ?? fallback.os_version,
    appVersion: str(raw.app_version) ?? fallback.app_version,
    model: str(raw.model) ?? fallback.model,
    batteryPercent: num(raw.battery_percent) ?? fallback.battery_percent,
    batteryCharging: boolean(raw.battery_charging) ?? fallback.battery_charging,
    online: boolean(raw.online) ?? true,
    lastSeen: str(raw.last_seen) ?? new Date().toISOString(),
  };
}
