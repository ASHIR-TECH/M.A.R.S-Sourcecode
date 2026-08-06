import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TransferRow } from '@/components/TransferRow';
import { StatusBar } from '@/components/StatusBar';
import { colours, fontSizes, radii, spacing } from '@/constants/colours';
import { useTransfers } from '@/contexts/TransferContext';
import type { Transfer } from '@/api/types';

type Filter = 'all' | 'sent' | 'received';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'sent', label: 'Sent' },
  { key: 'received', label: 'Received' },
];

export default function TransfersScreen() {
  const router = useRouter();
  const {
    transfers,
    loading,
    refreshing,
    error,
    refresh,
    startPolling,
    stopPolling,
  } = useTransfers();
  const [filter, setFilter] = useState<Filter>('all');

  // Poll every 3s while this tab is focused.
  useFocusEffect(
    useCallback(() => {
      startPolling();
      return () => stopPolling();
    }, [startPolling, stopPolling])
  );

  const filtered = transfers.filter(
    (t) => filter === 'all' || t.direction === filter
  );

  const renderHeader = () => (
    <View style={styles.filters}>
      {FILTERS.map((f) => (
        <Pressable
          key={f.key}
          onPress={() => setFilter(f.key)}
          style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
        >
          <Text
            style={[styles.filterText, filter === f.key && styles.filterTextActive]}
          >
            {f.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Ionicons name="file-tray-outline" size={48} color={colours.textSecondary} />
      <Text style={styles.emptyText}>No transfers yet.</Text>
      <Text style={styles.emptyHint}>
        Send a file from your desktop or ask your agent.
      </Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && transfers.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colours.gold} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TransferRow transfer={item} onPress={(t) => router.push(`/transfer/${t.id}`)} />
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={refresh}
          testID="transfers-list"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colours.bgDeep,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterTab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    minHeight: 36,
    justifyContent: 'center',
  },
  filterTabActive: {
    borderColor: colours.gold,
    backgroundColor: `${colours.gold}14`,
  },
  filterText: {
    color: colours.textSecondary,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
  },
  filterTextActive: {
    color: colours.gold,
  },
  listContent: {
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    color: colours.textPrimary,
    fontSize: fontSizes.lg,
    fontFamily: 'Offside',
    marginTop: spacing.md,
  },
  emptyHint: {
    color: colours.textSecondary,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
    textAlign: 'center',
  },
  error: {
    color: colours.danger,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
