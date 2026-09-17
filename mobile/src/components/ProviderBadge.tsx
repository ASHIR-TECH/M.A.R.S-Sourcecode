import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface ProviderBadgeProps {
  /** Desktop adapter that answered (display-only). */
  label?: string;
  /** Reply came from quick-response fallback rather than a paired desktop. */
  viaFallback?: boolean;
}

/**
 * Small caption under AI messages naming what answered (PHASE_12 FR-2).
 * Renders nothing when there's nothing to disclose.
 */
export function ProviderBadge({ label, viaFallback }: ProviderBadgeProps) {
  if (!label && !viaFallback) return null;
  return (
    <Text style={styles.text}>{viaFallback ? 'Quick-response mode' : label}</Text>
  );
}

const styles = StyleSheet.create({
  text: { color: colors.textMuted, fontSize: 10, marginTop: 2, fontStyle: 'italic' },
});
