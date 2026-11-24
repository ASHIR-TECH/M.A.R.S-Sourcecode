import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Device } from '../types/device';
import { displayDeviceName } from '../utils/deviceName';
import { fonts } from '../theme/typography';
import { glass } from '../theme/glass';
import { spacing } from '../theme/spacing';

interface DeviceCardProps {
  device: Device;
  onPress?: (device: Device) => void;
}

/** Responsive name font: short names are big, longer names get progressively smaller. */
function nameFontSize(name: string): number {
  const len = name.length;
  if (len <= 6) return 26;
  if (len <= 10) return 22;
  if (len <= 14) return 18;
  return 15;
}

/**
 * Home grid tile. Deliberately shows nothing but the connected device's name:
 * the 2x2 grid is a launcher, and extra telemetry made the tiles different
 * heights (an "elongated" row once a real device joined the placeholders).
 * Tap opens the per-device detail sheet where the metrics live.
 */
function DeviceCardBase({ device, onPress }: DeviceCardProps) {
  const name = displayDeviceName(device.name);

  return (
    <Pressable
      onPress={() => onPress?.(device)}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${device.status}`}
    >
      <BlurView
        intensity={glass.intensity}
        tint={glass.tint}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      <Text
        numberOfLines={2}
        ellipsizeMode="tail"
        style={[styles.name, { fontSize: nameFontSize(name) }]}
      >
        {name}
      </Text>
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
    width: '100%',
    // Every tile is the same square, so the grid never changes shape when a
    // device replaces a placeholder.
    aspectRatio: 1,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  name: {
    color: '#FFFFFF',
    fontFamily: fonts.offside,
    textAlign: 'center',
  },
});
