import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { DeviceWithMetrics } from '../types/device';
import { StatusPill } from './StatusPill';
import { fonts } from '../theme/typography';
import { glass } from '../theme/glass';
import { spacing } from '../theme/spacing';
import { colors } from '../theme/colors';

interface NodeCardProps {
  node: DeviceWithMetrics;
  onEdit: (node: DeviceWithMetrics) => void;
  onRemove: (node: DeviceWithMetrics) => void;
}

/** Rectangular glass card mirroring what's shown on Home (id, name, os,
 * status, lastSeen). No decorations inside; the edit button sits below the card.
 * The per-device "+" opens a small popup with Edit and Remove (delete that ONE
 * device only, followed by a haptic). */
export function NodeCard({ node, onEdit, onRemove }: NodeCardProps) {
  // Longer names get a smaller font so they always fit on one line.
  const nameFontSize = Math.max(12, Math.min(20, 26 - node.name.length * 0.75));
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
              <Text style={styles.sheetTitle}>{node.name}</Text>
              <Text style={styles.sheetSubtitle}>{node.id}</Text>

              <Pressable
                onPress={() => {
                  setMenuOpen(false);
                  onEdit(node);
                }}
                style={styles.sheetRow}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${node.name}`}
              >
                <Text style={styles.sheetRowText}>Edit Device</Text>
              </Pressable>

              <Pressable
                onPress={handleRemovePress}
                style={[styles.sheetRow, styles.sheetRowDanger, confirmRemove && styles.sheetRowArmed]}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${node.name}`}
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 300,
    backgroundColor: '#1A0F08',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(215, 128, 30, 0.7)',
    borderRadius: 16,
    padding: spacing.lg,
  },
  sheetTitle: { color: '#FFFFFF', fontFamily: fonts.offside, fontSize: 16 },
  sheetSubtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2, marginBottom: spacing.md },
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