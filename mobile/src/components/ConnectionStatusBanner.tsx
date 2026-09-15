import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConnectionStore } from '../store/useConnectionStore';
import { colors } from '../theme/colors';

const STATUS_COPY: Record<string, string> = {
  connecting: 'Connecting to station…',
  disconnected: 'Connection lost — retrying…',
  auth_failed: 'Pairing expired. Please re-scan your desktop\u2019s QR code.',
  error: 'Connection error — retrying…',
};

export function ConnectionStatusBanner() {
  const status = useConnectionStore((s) => s.status);
  const insets = useSafeAreaInsets();
  if (status === 'connected') return null;

  return (
    <View style={[styles.banner, { paddingTop: insets.top }]}>
      <Text style={styles.text}>{STATUS_COPY[status] ?? ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(232,163,77,0.15)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  text: { color: colors.accent, fontSize: 12 },
});
