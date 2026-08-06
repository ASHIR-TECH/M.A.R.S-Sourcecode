import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colours, fontSizes, spacing } from '@/constants/colours';
import { formatBytes, shortPeerId, timeAgo } from '@/lib/format';
import type { Transfer } from '@/api/types';
import { Badge } from './Badge';

interface TransferRowProps {
  transfer: Transfer;
  onPress?: (transfer: Transfer) => void;
}

/** Single transfer row in the Transfers list. */
export function TransferRow({ transfer, onPress }: TransferRowProps) {
  const badgeVariant = transfer.status as
    | 'Delivered'
    | 'Verified'
    | 'Pending'
    | 'InProgress'
    | 'Failed'
    | 'Cancelled'
    | 'Alerted';

  return (
    <View
      style={styles.row}
      testID="transfer-row"
      accessibilityRole={onPress ? 'button' : undefined}
      onTouchEnd={onPress ? () => onPress(transfer) : undefined}
    >
      <View style={styles.main}>
        <Text style={styles.filename} numberOfLines={1}>
          {transfer.filename}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {transfer.direction === 'sent' ? 'Sent to' : 'Received from'} {shortPeerId(transfer.peer)}
          {'  ·  '}
          {formatBytes(transfer.size)}
        </Text>
      </View>
      <View style={styles.side}>
        <Badge label={transfer.status} variant={badgeVariant} />
        <Text style={styles.time}>{timeAgo(transfer.timestamp)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colours.bgSurface,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    borderRadius: 12,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
  },
  main: {
    flex: 1,
    marginRight: spacing.md,
  },
  filename: {
    color: colours.textPrimary,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  meta: {
    color: colours.textSecondary,
    fontSize: fontSizes.xs,
    marginTop: 4,
  },
  side: {
    alignItems: 'flex-end',
    gap: 6,
  },
  time: {
    color: colours.textSecondary,
    fontSize: fontSizes.xs,
  },
});
