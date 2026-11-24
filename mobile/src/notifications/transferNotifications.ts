import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { MediaRef } from '../media/types';

let configured = false;

/**
 * Ask for notification permission once and register the Android channel used
 * for incoming transfers. Safe to call repeatedly; failures are silent because
 * a denied permission must never break chat.
 */
export async function initTransferNotifications(): Promise<void> {
  if (configured) return;
  configured = true;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('transfers', {
        name: 'Transfers',
        description: 'Photos and files received from a paired desktop',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 120, 80, 120],
        lightColor: '#E8A34D',
      });
    }

    const current = await Notifications.getPermissionsAsync();
    if (current.status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  } catch {
    // Notifications are best-effort (e.g. web preview has no native module).
  }
}

function titleFor(media: MediaRef): string {
  if (media.mimeType.startsWith('image/')) return '📷 New photo received';
  if (media.mimeType.startsWith('video/')) return '🎬 New video received';
  if (media.mimeType.startsWith('audio/')) return '🎵 New audio received';
  return '📎 New file received';
}

/** Show a system notification for a media transfer that reached this phone. */
export async function notifyTransfer(media: MediaRef, text?: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: titleFor(media),
        body: (text && text.trim()) || media.name,
        data: { mediaId: media.id, serviceUrl: media.serviceUrl },
        ...(Platform.OS === 'android' ? { channelId: 'transfers' } : {}),
      },
      // null = deliver immediately.
      trigger: null,
    });
  } catch {
    // A missing permission or module must not surface as a chat error.
  }
}
