import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DeviceStatus } from '../types/device';

const STATUS_CONFIG: Record<DeviceStatus, { label: string; color: string }> = {
  online: { label: 'ONLINE', color: '#4CD964' },
  idle: { label: 'IDLE', color: '#E8A34D' },
  offline: { label: 'OFFLINE', color: '#8A7A68' },
};

export function StatusPill({ status }: { status: DeviceStatus }) {
  const { label, color } = STATUS_CONFIG[status];
  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
});
