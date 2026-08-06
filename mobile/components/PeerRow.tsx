import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colours, fontSizes, radii, spacing } from '@/constants/colours';
import { connectedSince, pathLabel, shortPeerId } from '@/lib/format';
import type { Session } from '@/api/types';

interface PeerRowProps {
  session: Session;
}

/** Single peer row — nickname, connection path badge, connected-since. */
export function PeerRow({ session }: PeerRowProps) {
  return (
    <View style={styles.row} testID="peer-row">
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(session.nickname ?? session.peer_id ?? '?').slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={1}>
          {session.nickname ?? shortPeerId(session.peer_id)}
        </Text>
        <Text style={styles.peerId} numberOfLines={1}>
          {shortPeerId(session.peer_id)}
        </Text>
      </View>
      <View style={styles.side}>
        <View
          style={[
            styles.pathBadge,
            { borderColor: session.path_type === 'direct_ipv4' || session.path_type === 'direct_ipv6' || session.path_type === 'lan' ? colours.success : colours.goldDim },
          ]}
        >
          <Text
            style={[
              styles.pathText,
              { color: session.path_type === 'direct_ipv4' || session.path_type === 'direct_ipv6' || session.path_type === 'lan' ? colours.success : colours.gold },
            ]}
          >
            {pathLabel(session.path_type)}
          </Text>
        </View>
        {session.connected_at ? (
          <Text style={styles.since}>online {connectedSince(session.connected_at)}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colours.bgSurface,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    borderRadius: radii.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colours.bgSurfaceAlt,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colours.gold,
    fontSize: fontSizes.lg,
    fontFamily: 'Audiowide',
  },
  main: {
    flex: 1,
    marginRight: spacing.md,
  },
  name: {
    color: colours.textPrimary,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  peerId: {
    color: colours.textSecondary,
    fontSize: fontSizes.xs,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  side: {
    alignItems: 'flex-end',
    gap: 4,
  },
  pathBadge: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pathText: {
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
  since: {
    color: colours.textSecondary,
    fontSize: fontSizes.xs,
  },
});
