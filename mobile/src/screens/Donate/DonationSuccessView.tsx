import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface DonationSuccessViewProps {
  amount: number;
  currency: string;
  txRef: string;
  onDone: () => void;
}

export function DonationSuccessView({ amount, currency, txRef, onDone }: DonationSuccessViewProps) {
  return (
    <View style={styles.container}>
      <View style={styles.checkWrap}>
        <Text style={styles.check}>✓</Text>
      </View>
      <Text style={styles.title}>Thank You</Text>
      <Text style={styles.body}>Your donation of {currency}{amount} has been received.</Text>
      <Text style={styles.ref}>Reference: {txRef}</Text>
      <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} onPress={onDone} accessibilityRole="button">
        <Text style={styles.buttonText}>Done</Text>
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
    gap: spacing.sm,
    padding: spacing.xl,
  },
  checkWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(232,163,77,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  check: { color: colors.accent, fontSize: 34, fontWeight: '700' },
  title: { color: colors.textPrimary, fontSize: 22, fontWeight: '700' },
  body: { color: colors.textMuted, textAlign: 'center' },
  ref: { color: colors.textMuted, fontSize: 11, marginTop: spacing.sm },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  buttonPressed: { backgroundColor: '#D7801E' },
  buttonText: { color: '#0B0704', fontWeight: '700' },
});