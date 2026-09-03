import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export function TypingIndicator() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Co-Pilot is thinking…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  text: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic' },
});
