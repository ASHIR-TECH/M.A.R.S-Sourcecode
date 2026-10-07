import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

interface UpdateBannerProps {
  message?: string;
  url?: string;
  force?: boolean;
  onDismiss?: () => void;
}

export function UpdateBanner({ message = 'Update available for performance and security fixes.', url, force, onDismiss }: UpdateBannerProps) {
  const handlePress = () => {
    if (url) Linking.openURL(url);
  };
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{force ? 'Critical Update Required' : 'Update Available'}</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.row}>
        {url && (
          <Pressable style={styles.button} onPress={handlePress}>
            <Text style={styles.buttonText}>{force ? 'Update Now' : 'Get Update'}</Text>
          </Pressable>
        )}
        {!force && onDismiss && (
          <Pressable style={styles.dismiss} onPress={onDismiss}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(232,163,77,0.5)',
    padding: 12,
    marginBottom: 12,
  },
  title: {
    color: colors.accent,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  button: { backgroundColor: colors.accent, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  buttonText: { color: '#131314', fontWeight: '600', fontSize: 12 },
  dismiss: { paddingHorizontal: 8 },
  dismissText: { color: colors.textMuted, fontSize: 12 },
});
