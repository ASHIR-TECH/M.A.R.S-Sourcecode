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

export function DeviceCard({ device, onPress }: DeviceCardProps) {
  const nameFontSize = Math.max(14, 26 - device.name.length * 0.75);
  return (
    <Pressable
      onPress={() => onPress?.(device)}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${device.name}, ${device.status}`}
    >
      <BlurView intensity={glass.intensity} tint={glass.tint} style={StyleSheet.absoluteFill} />
      <View style={styles.topRow}>
        <Text style={styles.id}>{device.id}</Text>
        <StatusPill status={device.status} />
      </View>
      <Text style={[styles.name, { fontSize: nameFontSize }]}>{device.name}</Text>
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
    backgroundColor: 'rgba(37, 17, 1, 0.62)',
    borderRadius: glass.radius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(215, 128, 30, 0.7)', /**this is for the border  */
    padding: spacing.md,
    width: 160,
    gap: 4,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  id: { color: '#E9DCCB', fontSize: 11 }, /** this is for the DEV- number i presume*/
  name: {
    color: '#FFFFFF', /**this is for the time, lie 2mins ago and 1day */
    fontFamily: fonts.offside,
    marginTop: spacing.xs,
  },
  os: { color: '#cd7b01', fontSize: 12 } /** this is for the operating systems */,
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  metaLabel: { color: '#E9DCCB', fontSize: 11 }, /**i dont know wtf this is for and i am not fucking touching the shit */
  metaValue: { color: '#bdbdbc', fontSize: 11 },
});
