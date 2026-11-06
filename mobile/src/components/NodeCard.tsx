import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { DeviceWithMetrics } from '../types/device';
import { StatusPill } from './StatusPill';
import { displayDeviceName } from '../utils/deviceName';
import { fonts } from '../theme/typography';
import { glass } from '../theme/glass';
import { spacing } from '../theme/spacing';
import { colors } from '../theme/colors';

interface NodeCardProps {
  node: DeviceWithMetrics;
  onEdit: (node: DeviceWithMetrics) => void;
  onRemove: (node: DeviceWithMetrics) => void;
}

/** Responsive name font: short names are big, longer names get progressively smaller. */
function nameFontSize(name: string): number {
  const len = name.length;
  if (len <= 6) return 22;
  if (len <= 10) return 18;
  if (len <= 14) return 15;
  return 12;
}

/** Rectangular glass card showing name, os, status, cpu, ram, battery.
 * The per-device "+" opens a detail sheet with live metrics plus Edit and
 * Remove (delete that ONE device only, followed by a haptic). */
function NodeCardBase({ node, onEdit, onRemove }: NodeCardProps) {
  const name = displayDeviceName(node.name);
  const kind = node.collectionId === 'paired' ? 'PAIRED' : 'PEER';
  const nameFont = nameFontSize(name);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const openMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setConfirmRemove(false);
    setMenuOpen(true);
  };

  const handleRemovePress = () => {
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    setMenuOpen(false);
    onRemove(node);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <BlurView intensity={glass.intensity} tint={glass.tint} experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
        <View style={styles.topRow}>
          <Text style={styles.kind}>{kind}</Text>
          <StatusPill status={node.status} />
        </View>
        {/* Device name — big, responsive (longer names get smaller) */}
        <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.name, { fontSize: nameFont }]}>
          {name}
        </Text>
        {/* OS directly under the name */}
        <Text style={styles.os}>{node.os}</Text>
        <View style={styles.metricsRow}>
          <View style={styles.metricChip}>
            <Text style={styles.metric}>CPU: {Math.round(node.cpu)}%</Text>
          </View>
          <View style={styles.metricChip}>
            <Text style={styles.metric}>Ram: {Math.round(node.ram)}%</Text>
          </View>
          {node.batteryPercent !== undefined && (
            <View style={styles.metricChip}>
              <Text style={styles.battery}>
                {Math.round(node.batteryPercent)}%{node.batteryCharging ? ' ⚡' : ''}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.bottomRow}>
          <Text style={styles.metaLabel}>Active</Text>
          <Text style={styles.metaValue}>{node.lastSeen}</Text>
        </View>
      </View>

      <Pressable
        onPress={openMenu}
        style={styles.editButton}
        accessibilityRole="button"
        accessibilityLabel={`Options for ${node.name}`}
        hitSlop={8}
      >
        <Text style={styles.editText}>+</Text>
      </Pressable>

      {menuOpen && (
        <Modal transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)}>
            <Pressable style={styles.sheet}>
              <View style={styles.sheetHead}>
                <View style={styles.sheetAvatar}>
                  <Text style={styles.sheetAvatarText}>{name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.sheetHeadText}>
                  <Text style={styles.sheetTitle} numberOfLines={1}>{name}</Text>
                  <Text style={styles.sheetSubtitle} numberOfLines={1}>
                    {node.os} · {node.status}
                  </Text>
                </View>
                <View style={styles.sheetHeadStatus}>
                  <StatusPill status={node.status} />
                </View>
              </View>

              <View style={styles.sheetMetrics}>
                <View style={styles.sheetMetric}>
                  <Text style={styles.sheetMetricLabel}>CPU</Text>
                  <Text style={styles.sheetMetricValue}>{Math.round(node.cpu)}%</Text>
                </View>
                <View style={styles.sheetMetric}>
                  <Text style={styles.sheetMetricLabel}>RAM</Text>
                  <Text style={styles.sheetMetricValue}>{Math.round(node.ram)}%</Text>
                </View>
                {node.batteryPercent !== undefined && (
                  <View style={styles.sheetMetric}>
                    <Text style={styles.sheetMetricLabel}>BATTERY</Text>
                    <Text style={styles.sheetMetricValue}>
                      {Math.round(node.batteryPercent)}%{node.batteryCharging ? ' ⚡' : ''}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.sheetSeen}>Last seen {node.lastSeen}</Text>

              <Pressable
                onPress={() => {
                  setMenuOpen(false);
                  onEdit(node);
                }}
                style={styles.sheetRow}
                accessibilityRole="button"
                accessibilityLabel={`Rename ${name}`}
              >
                <Text style={styles.sheetRowText}>Rename Device</Text>
              </Pressable>

              <Pressable
                onPress={handleRemovePress}
                style={[styles.sheetRow, styles.sheetRowDanger, confirmRemove && styles.sheetRowArmed]}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${name}`}
              >
                <Text style={styles.sheetRemoveText}>
                  {confirmRemove ? 'Confirm Remove' : 'Remove Device'}
                </Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

export const NodeCard = React.memo(NodeCardBase);

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
    minHeight: 160,
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
    fontSize: 18,
    marginTop: spacing.xs,
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#1A0F08',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(215, 128, 30, 0.7)',
    borderRadius: 18,
    padding: spacing.lg,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sheetAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232,163,77,0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232,163,77,0.5)',
  },
  sheetAvatarText: { color: '#FFFFFF', fontFamily: fonts.offside, fontSize: 16 },
  sheetHeadText: { flex: 1, minWidth: 0 },
  sheetHeadStatus: { marginLeft: 'auto' },
  sheetTitle: { color: '#FFFFFF', fontFamily: fonts.offside, fontSize: 17 },
  sheetSubtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  sheetMetrics: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.md,
  },
  sheetMetric: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center',
  },
  sheetMetricLabel: {
    color: '#cd7b01',
    fontSize: 8,
    letterSpacing: 1,
    fontFamily: fonts.quantico,
  },
  sheetMetricValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: fonts.quantico,
    marginTop: 2,
  },
  sheetSeen: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  sheetRow: {
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginTop: spacing.sm,
  },
  sheetRowDanger: {
    backgroundColor: 'rgba(224,90,71,0.12)',
    borderColor: 'rgba(224,90,71,0.6)',
  },
  sheetRowArmed: {
    backgroundColor: 'rgba(224,90,71,0.25)',
    borderColor: '#E05A47',
  },
  sheetRowText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  sheetRemoveText: { color: '#E05A47', fontSize: 15, fontWeight: '700' },
});
