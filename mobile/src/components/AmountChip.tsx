import React from 'react';
import { Pressable, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

interface AmountChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function AmountChip({ label, active, onPress, style }: AmountChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.chipPressed, style]}
    >
      <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(215,128,30,0.4)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipPressed: { backgroundColor: 'rgba(255,255,255,0.12)' },
  label: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  labelActive: { color: '#0B0704' },
});