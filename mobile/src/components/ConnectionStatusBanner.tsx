import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConnectionStore } from '../store/useConnectionStore';
import { usePairingStore } from '../store/usePairingStore';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

const STATUS_COPY: Record<string, string> = {
  connecting: 'Connecting to station…',
  disconnected: 'Connection lost — retrying…',
  auth_failed: 'Pairing expired. Please re-scan your desktop\u2019s QR code.',
  error: 'Connection error — retrying…',
};

export function ConnectionStatusBanner() {
  const status = useConnectionStore((s) => s.status);
  const pairedDesktop = usePairingStore((s) => s.pairedDesktop);
  const insets = useSafeAreaInsets();

  // The relay connection is only relevant once a desktop is paired, and its
  // retry loop runs in the background from there. Until then the status is
  // still the untouched initial 'disconnected' — showing "retrying" would be
  // a lie. Hide the banner so it only appears for a real connection and then
  // clears itself once the relay connects.
  if (!pairedDesktop || status === 'connected') return null;

  return (
    <View style={[styles.banner, { top: insets.top + spacing.md }]}>
      <Text style={styles.text}>{STATUS_COPY[status] ?? ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(232,163,77,0.15)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  text: { color: colors.accent, fontSize: 12 },
});
