import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Device } from '../types/device';
import { StatusPill } from './StatusPill';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface DeviceCardProps {
  device: Device;
  onPress?: (device: Device) => void;
}

export function DeviceCard({ device, onPress }: DeviceCardProps) {
  return (
    <Pressable
      onPress={() => onPress?.(device)}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${device.name}, ${device.status}`}
    >
      <View style={styles.topRow}>
        <Text style={styles.id}>{device.id}</Text>
        <StatusPill status={device.status} />
      </View>
      <Text style={styles.name}>{device.name}</Text>
      <Text style={styles.os}>{device.os}</Text>
      <View style={styles.bottomRow}>
        <Text style={styles.metaLabel}>Active</Text>
        <Text style={styles.metaValue}>{device.lastSeen}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: spacing.md,
    width: 160,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  id: { color: colors.textMuted, fontSize: 11 },
  name: { color: colors.textPrimary, fontWeight: '700', fontSize: 15, marginTop: spacing.xs },
  os: { color: colors.textMuted, fontSize: 12 },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  metaLabel: { color: colors.textMuted, fontSize: 11 },
  metaValue: { color: colors.textMuted, fontSize: 11 },
});
