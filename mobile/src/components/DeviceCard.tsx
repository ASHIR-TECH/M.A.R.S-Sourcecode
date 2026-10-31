import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Device } from '../types/device';
import { StatusPill } from './StatusPill';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { glass } from '../theme/glass';
import { spacing } from '../theme/spacing';

interface DeviceCardProps {
  device: Device;
  onPress?: (device: Device) => void;
}

/** Show a short human-readable ID instead of the full libp2p peer ID. */
function displayId(id: string): string {
  // libp2p peer IDs are base58 (e.g. 12D3KooW...). Use first 8 chars + ellipsis.
  // If it looks like a short DEV-XXX id, show as-is.
  if (id.startsWith('DEV-') || id.length <= 12) return id;
  return `${id.slice(0, 8)}…`;
}

function DeviceCardBase({ device, onPress }: DeviceCardProps) {
  return (
    <Pressable
      onPress={() => onPress?.(device)}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${device.name}, ${device.status}`}
    >
      <BlurView intensity={glass.intensity} tint={glass.tint} experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
      <View style={styles.topRow}>
        <Text style={styles.id}>{displayId(device.id)}</Text>
        <StatusPill status={device.status} />
      </View>
      <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">{device.name}</Text>
      <Text style={styles.os}>{device.os}</Text>
      <View style={styles.bottomRow}>
        <Text style={styles.metaLabel}>Active</Text>
        <Text style={styles.metaValue}>{device.lastSeen}</Text>
      </View>
    </Pressable>
  );
}

export const DeviceCard = React.memo(DeviceCardBase);

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(37, 17, 1, 0.62)',
    borderRadius: glass.radius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(215, 128, 30, 0.7)',
    padding: spacing.md,
    gap: 4,
    overflow: 'hidden',
    minHeight: 110,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  id: { color: '#E9DCCB', fontSize: 10, fontFamily: fonts.quantico },
  name: {
    color: '#FFFFFF',
    fontFamily: fonts.offside,
    fontSize: 18,
  },
  os: { color: '#cd7b01', fontSize: 11 },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  metaLabel: { color: '#E9DCCB', fontSize: 10 },
  metaValue: { color: '#bdbdbc', fontSize: 10 },
});
