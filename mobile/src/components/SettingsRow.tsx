import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface SettingsRowProps {
  label: string;
  value?: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}

export function SettingsRow({ label, value, icon, onPress, destructive, showChevron = true }: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.left}>
        {icon}
        <Text style={[styles.label, destructive && styles.destructive]}>{label}</Text>
      </View>
      <View style={styles.right}>
        {value && <Text style={styles.value}>{value}</Text>}
        {showChevron && !destructive && <Text style={styles.chevron}>{'›'}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  pressed: { backgroundColor: 'rgba(255,255,255,0.04)' },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: { color: colors.textPrimary, fontSize: 14 },
  destructive: { color: '#E05A47' },
  value: { color: colors.textMuted, fontSize: 13 },
  chevron: { color: colors.textMuted, fontSize: 16 },
});
