import React from 'react';
import { View, Text, Pressable, Linking, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export function PermissionDeniedView() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Camera Access Needed</Text>
      <Text style={styles.body}>
        Mars needs camera access to scan your desktop's pairing code. You can enable it in
        Settings.
      </Text>
      <Pressable style={styles.button} onPress={() => Linking.openSettings()}>
        <Text style={styles.buttonText}>Open Settings</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  body: { color: colors.textMuted, textAlign: 'center', fontSize: 13 },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  buttonText: { color: '#0B0704', fontWeight: '700' },
});