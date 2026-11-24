import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Device } from '../types/device';
import { StatusPill } from './StatusPill';
import { displayDeviceName } from '../utils/deviceName';
import { fonts } from '../theme/typography';
import { glass } from '../theme/glass';
import { spacing } from '../theme/spacing';

interface DeviceCardProps {
  device: Device;
  onPress?: (device: Device) => void;
}

/** Short, readable id for the card header (peer ids are long base58 strings). */
function displayId(id: string): string {
  if (id.startsWith('DEV-') || id.length <= 12) return id;
  return `${id.slice(0, 8)}…`;
}

/** Larger names get a smaller font so every tile keeps the same silhouette. */
function nameFontSize(name: string): number {
  const len = name.length;
  if (len <= 6) return 22;
  if (len <= 10) return 20;
  if (len <= 14) return 17;
  return 14;
}

/**
 * Home tile, matching the Figma Command Center card:
 *   id + status pill
 *   DEVICE NAME
 *   OS
 *   divider
 *   Active / last seen
 *
 * The 2x2 grid always renders four identical tiles; placeholders use the same
 * fixed height so adding a device never stretches a row.
 */
function DeviceCardBase({ device, onPress }: DeviceCardProps) {
  const name = displayDeviceName(device.name).toUpperCase();

  return (
    <Pressable
      onPress={() => onPress?.(device)}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${device.status}, active ${device.lastSeen}`}
    >
      <BlurView
        intensity={glass.intensity}
        tint={glass.tint}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topRow}>
        <Text style={styles.id} numberOfLines={1}>
          {displayId(device.id)}
        </Text>
        <StatusPill status={device.status} />
      </View>
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[styles.name, { fontSize: nameFontSize(name) }]}
      >
        {name}
      </Text>
      <Text style={styles.os} numberOfLines={1}>
        {device.os}
      </Text>
      <View style={styles.divider} />
      <View style={styles.bottomRow}>
        <Text style={styles.metaLabel}>Active</Text>
        <Text style={styles.metaValue} numberOfLines={1}>
          {device.lastSeen}
        </Text>
      </View>
    </Pressable>
  );
}

export const DeviceCard = React.memo(DeviceCardBase);

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(58, 33, 20, 0.78)',
    borderRadius: glass.radius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(215, 128, 30, 0.7)',
    width: '100%',
    height: 132,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  id: {
    color: '#E9DCCB',
    fontFamily: fonts.quantico,
    fontSize: 10,
    letterSpacing: 0.6,
    flexShrink: 1,
  },
  name: {
    color: '#FFFFFF',
    fontFamily: fonts.quantico,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  os: {
    color: '#cd7b01',
    fontFamily: fonts.montserrat,
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(233, 220, 203, 0.28)',
    marginVertical: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  metaLabel: {
    color: '#E9DCCB',
    fontFamily: fonts.montserrat,
    fontSize: 10,
  },
  metaValue: {
    color: '#bdbdbc',
    fontFamily: fonts.montserrat,
    fontSize: 10,
    flexShrink: 1,
    textAlign: 'right',
  },
});
