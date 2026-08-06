import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colours, radii, statusColours } from '@/constants/colours';

export type BadgeVariant =
  | 'Delivered'
  | 'Verified'
  | 'Pending'
  | 'InProgress'
  | 'Failed'
  | 'Cancelled'
  | 'Alerted';

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
}

/** Status pill: bordered, background tinted by status colour. */
export function Badge({ label, variant }: BadgeProps) {
  const color = statusColours[variant] ?? colours.textSecondary;
  return (
    <View
      style={[
        styles.pill,
        { borderColor: color, backgroundColor: `${color}1A` },
      ]}
      testID={`badge-${variant}`}
    >
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
