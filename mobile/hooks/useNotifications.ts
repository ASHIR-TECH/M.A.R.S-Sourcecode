import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { deregisterDeviceToken, registerDeviceToken } from '@/api/agent';
import { useAuth } from '@/contexts/AuthContext';

const DEVICE_NAME_KEY = 'mars_device_name';

// Remote (push) notifications were removed from Expo Go in SDK 53, and merely
// importing expo-notifications crashes there. Load it lazily and degrade
// gracefully when running inside Expo Go (needs a development build).
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

async function loadNotifications(): Promise<typeof import('expo-notifications') | null> {
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

function makeDeviceName(): string {
  const base =
    Constants.deviceName ?? Constants.expoConfig?.name ?? 'MARS mobile device';
  return `${base}-${Date.now().toString(36)}`;
}

async function getOrCreateDeviceName(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_NAME_KEY);
  if (existing) return existing;
  const fresh = makeDeviceName();
  await SecureStore.setItemAsync(DEVICE_NAME_KEY, fresh);
  return fresh;
}

interface UseNotificationsResult {
  /** Whether push notifications are supported on this build (false in Expo Go). */
  supported: boolean;
  permissionGranted: boolean;
  registered: boolean;
  enabled: boolean;
  error: string | null;
  /** Registers the Expo push token with the desktop peer (idempotent). */
  enable: () => Promise<boolean>;
  /** Deregisters the device token from the desktop peer. */
  disable: () => Promise<void>;
}

/**
 * Push notification registration. On enable: requests permission, gets the
 * Expo push token, and registers it with the desktop peer via
 * POST /api/v1/agent/device-token. The device name persists in secure storage
 * so disabling later can deregister the exact same token row.
 */
export function useNotifications(): UseNotificationsResult {
  const { isAuthenticated } = useAuth();
  const [supported] = useState(!IS_EXPO_GO);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!IS_EXPO_GO) {
      void (async () => {
        const Notifications = await loadNotifications();
        if (!Notifications) return;
        const p = await Notifications.getPermissionsAsync();
        if (active) setPermissionGranted(p.granted);
      })();
    }
    void SecureStore.getItemAsync(DEVICE_NAME_KEY).then((name) => {
      if (active && name) setEnabled(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const enable = useCallback(async (): Promise<boolean> => {
    if (IS_EXPO_GO) {
      setError('Push notifications need a development build (unavailable in Expo Go).');
      return false;
    }
    if (!isAuthenticated) {
      setError('Connect to a desktop peer before enabling notifications.');
      return false;
    }
    setError(null);
    try {
      const Notifications = await loadNotifications();
      if (!Notifications) {
        setError('Push notifications are unavailable on this build.');
        return false;
      }
      let perms = await Notifications.getPermissionsAsync();
      if (!perms.granted) {
        const request = await Notifications.requestPermissionsAsync();
        if (!request.granted) {
          setError('Notifications are blocked. Enable them in system settings.');
          return false;
        }
        perms = request;
      }
      setPermissionGranted(true);

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      const deviceName = await getOrCreateDeviceName();
      await registerDeviceToken({ expo_push_token: token, device_name: deviceName });
      setRegistered(true);
      setEnabled(true);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to register push notifications.');
      return false;
    }
  }, [isAuthenticated]);

  const disable = useCallback(async () => {
    try {
      const deviceName = await SecureStore.getItemAsync(DEVICE_NAME_KEY);
      if (deviceName) {
        await deregisterDeviceToken(deviceName);
        await SecureStore.deleteItemAsync(DEVICE_NAME_KEY);
      }
    } catch {
      // Best-effort deregistration; the desktop cleans up stale tokens.
    }
    setEnabled(false);
    setRegistered(false);
  }, []);

  return { supported, permissionGranted, registered, enabled, error, enable, disable };
}
