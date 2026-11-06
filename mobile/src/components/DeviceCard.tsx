import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Device, DeviceWithMetrics } from '../types/device';
import { StatusPill } from './StatusPill';
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
  if (len <= 6) return 24;
  if (len <= 10) return 20;
  if (len <= 14) return 17;
  return 14;
}

function DeviceCardBase({ device, onPress }: DeviceCardProps) {
  // Paired desktops carry polled telemetry; relay-only peers do not.
  const metrics = device as Partial<DeviceWithMetrics>;
  const hasMetrics =
    metrics.cpu !== undefined ||
    metrics.ram !== undefined ||
    metrics.batteryPercent !== undefined;
  const name = displayDeviceName(device.name);
  const kind = metrics.collectionId === 'paired' ? 'PAIRED' : 'PEER';

  return (
    <Pressable
      onPress={() => onPress?.(device)}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${device.status}`}
    >
      <BlurView intensity={glass.intensity} tint={glass.tint} experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
      <View style={styles.topRow}>
        <Text style={styles.kind}>{kind}</Text>
        <StatusPill status={device.status} />
      </View>
      {/* Device name — big, responsive (longer names get smaller) */}
      <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.name, { fontSize: nameFontSize(name) }]}>
        {name}
      </Text>
      {/* OS directly under the name */}
      <Text style={styles.os}>{device.os}</Text>
      {hasMetrics ? (
        <View style={styles.metricsRow}>
          {metrics.cpu !== undefined && (
            <View style={styles.metricChip}>
              <Text style={styles.metric}>CPU: {Math.round(metrics.cpu)}%</Text>
            </View>
          )}
          {metrics.ram !== undefined && (
            <View style={styles.metricChip}>
              <Text style={styles.metric}>Ram: {Math.round(metrics.ram)}%</Text>
            </View>
          )}
          {metrics.batteryPercent !== undefined && (
            <View style={styles.metricChip}>
              <Text style={styles.battery}>
                {Math.round(metrics.batteryPercent)}%{metrics.batteryCharging ? ' ⚡' : ''}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.bottomRow}>
          <Text style={styles.metaLabel}>Active</Text>
          <Text style={styles.metaValue}>{device.lastSeen}</Text>
        </View>
      )}
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
    minHeight: 140,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  id: { color: '#E9DCCB', fontSize: 10, fontFamily: fonts.quantico },
  kind: {
    color: '#cd7b01',
    fontSize: 9,
    fontFamily: fonts.quantico,
    letterSpacing: 1.2,
  },
  name: {
    color: '#FFFFFF',
    fontFamily: fonts.offside,
    fontSize: 20,
  },
  os: { color: '#cd7b01', fontSize: 12, marginTop: 2 },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  metricChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  metric: { color: '#E9DCCB', fontSize: 10, fontFamily: fonts.quantico },
  battery: { color: '#E9DCCB', fontSize: 10, fontFamily: fonts.quantico },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  metaLabel: { color: '#E9DCCB', fontSize: 10 },
  metaValue: { color: '#bdbdbc', fontSize: 10 },
});
