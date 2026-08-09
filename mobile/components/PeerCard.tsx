import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { StatusDot } from '@/components/StatusDot';
import { colours, fontSizes, radii, spacing } from '@/constants/colours';
import { connectedSince, pathLabel, shortPeerId } from '@/lib/format';
import type { PathType, Session } from '@/api/types';

interface PeerCardProps {
  session: Session;
}

function pathColor(path?: PathType): { color: string; border: string } {
  switch (path) {
    case 'direct_ipv4':
    case 'direct_ipv6':
      return { color: colours.stateSuccess, border: colours.stateSuccess };
    case 'relay':
      return { color: colours.gold, border: colours.goldDim };
    case 'qowt':
      return { color: colours.purpleBright, border: colours.purpleMid };
    case 'lan':
      return { color: colours.info, border: colours.info };
    case 'hole_punch':
      return { color: colours.stateWarning, border: colours.stateWarning };
    default:
      return { color: colours.textSecondary, border: colours.purpleDim };
  }
}

/** Card showing one connected desktop: name, status, path, uptime, peer ID. */
export function PeerCard({ session }: PeerCardProps) {
  const [copied, setCopied] = useState(false);
  const name = session.nickname ?? shortPeerId(session.peer_id);
  const peerId = session.peer_id;
  const { color: pathColorValue, border: pathBorder } = pathColor(session.path_type);

  const copyPeerId = async () => {
    if (!peerId) return;
    await Clipboard.setStringAsync(peerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.card} testID="peer-card">
      <View style={styles.headerRow}>
        <View style={styles.nameRow}>
          <StatusDot status="connected" />
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <View style={[styles.pathBadge, { borderColor: pathBorder }]}>
          <Text style={[styles.pathText, { color: pathColorValue }]}>
            {pathLabel(session.path_type)}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>
          {session.connected_at
            ? `Connected ${connectedSince(session.connected_at)}`
            : 'Connecting…'}
        </Text>
        <Text style={styles.meta}>
          {session.transfer_count != null ? `${session.transfer_count} transfers this session` : ''}
        </Text>
      </View>

      <Pressable
        onLongPress={copyPeerId}
        disabled={!peerId}
        style={styles.peerIdRow}
        accessibilityRole="button"
        accessibilityLabel={`Peer ID ${name}`}
      >
        <Text style={styles.peerId} numberOfLines={1}>
          {shortPeerId(peerId)}
        </Text>
        <Text style={styles.copyHint}>{copied ? 'Copied' : 'hold to copy'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colours.bgSurface,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  name: {
    color: colours.textPrimary,
    fontSize: 16,
    fontFamily: 'Audiowide',
    flexShrink: 1,
  },
  pathBadge: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  pathText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  meta: {
    color: colours.textMuted,
    fontSize: 12,
    fontFamily: 'Offside',
  },
  peerIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  peerId: {
    color: colours.purpleBright,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  copyHint: {
    color: colours.textMuted,
    fontSize: 11,
    fontFamily: 'Offside',
  },
});
