import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { DeviceWithMetrics } from '../types/device';
import { StatusPill } from './StatusPill';
import { fonts } from '../theme/typography';
import { glass } from '../theme/glass';
import { spacing } from '../theme/spacing';

interface NodeCardProps {
  node: DeviceWithMetrics;
  onEdit: (node: DeviceWithMetrics) => void;
}

/** Rectangular glass card mirroring what's shown on Home (id, name, os,
 * status, lastSeen). No decorations inside; the edit button sits below the card. */
export function NodeCard({ node, onEdit }: NodeCardProps) {
  // Longer names get a smaller font so they always fit on one line.
  const nameFontSize = Math.max(12, Math.min(20, 26 - node.name.length * 0.75));

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <BlurView intensity={glass.intensity} tint={glass.tint} style={StyleSheet.absoluteFill} />
        <View style={styles.topRow}>
          <Text style={styles.id}>{node.id}</Text>
          <StatusPill status={node.status} />
        </View>
        <Text numberOfLines={1} style={[styles.name, { fontSize: nameFontSize }]}>{node.name}</Text>
        <Text style={styles.os}>{node.os}</Text>
        <View style={styles.bottomRow}>
          <Text style={styles.metaLabel}>Active</Text>
          <Text style={styles.metaValue}>{node.lastSeen}</Text>
        </View>
      </View>

      <Pressable
        onPress={() => onEdit(node)}
        style={styles.editButton}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${node.name}`}
        hitSlop={8}
      >
        <Text style={styles.editText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  card: {
    backgroundColor: 'rgba(37, 17, 1, 0.38)',
    borderRadius: glass.radius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(215, 128, 30, 0.7)',
    padding: spacing.md,
    gap: 4,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  id: { color: '#E9DCCB', fontSize: 11 },
  name: {
    color: '#FFFFFF',
    fontFamily: fonts.offside,
    fontSize: 14,
    marginTop: spacing.xs,
  },
  os: { color: '#cd7b01', fontSize: 12 },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  metaLabel: { color: '#E9DCCB', fontSize: 11 },
  metaValue: { color: '#bdbdbc', fontSize: 11 },
  editButton: {
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(232,163,77,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editText: { color: '#FFFFFF', fontSize: 13 },
});