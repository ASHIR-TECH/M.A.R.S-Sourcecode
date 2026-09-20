import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TransferReference } from '../desktop/types';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { spacing } from '../theme/spacing';

function formatBytes(bytes?: number): string {
  if (bytes == null) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

/** Compact file tile under an AI reply that references a completed transfer
 * (PHASE_14 §Chat). Pure display — the bytes moved on the desktop's P2P link. */
export function TransferFileTile({ transfer }: { transfer: TransferReference }) {
  const glyph = transfer.direction === 'incoming' ? '↓' : '↑';
  const line = [transfer.direction === 'incoming' ? 'from' : 'to', transfer.peerName, formatBytes(transfer.sizeBytes)]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={styles.tile}>
      <Text style={styles.glyph}>{glyph}</Text>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {transfer.fileName}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {line}
          {transfer.result ? ` — ${transfer.result}` : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232,163,77,0.5)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: spacing.xs,
    alignSelf: 'stretch',
  },
  glyph: { fontSize: 16, color: '#FFC46B', width: 22, textAlign: 'center' },
  body: { flex: 1 },
  name: { color: '#FFFFFF', fontSize: 13, fontFamily: fonts.montserrat, fontWeight: '600' },
  meta: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2, fontFamily: fonts.montserrat },
});