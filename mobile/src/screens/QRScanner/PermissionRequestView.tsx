import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface PermissionRequestViewProps {
  onRequest: () => void;
}

export function PermissionRequestView({ onRequest }: PermissionRequestViewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Camera Access Needed</Text>
      <Text style={styles.body}>
        Mars needs camera access to scan your desktop's pairing code. Allow access
        to open the scanner.
      </Text>
      <Pressable
        style={styles.button}
        onPress={onRequest}
        accessibilityRole="button"
        accessibilityLabel="Allow camera access"
      >
        <Text style={styles.buttonText}>Allow Camera Access</Text>
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
  body: { color: colors.textMuted, textAlign: 'center', fontSize: 13, lineHeight: 19 },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  buttonText: { color: '#0B0704', fontWeight: '700' },
});