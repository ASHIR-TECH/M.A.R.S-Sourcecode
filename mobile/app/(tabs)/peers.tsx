import React, { useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Device from 'expo-device';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientText } from '@/components/GradientText';
import { PeerCard } from '@/components/PeerCard';
import { colours, fontSizes, radii, spacing } from '@/constants/colours';
import { usePeers } from '@/contexts/PeerContext';

export default function PeersScreen() {
  const { sessions, loading, error, startPolling, stopPolling } = usePeers();

  // Poll every 8s while the tab is focused; pause on blur.
  useFocusEffect(
    useCallback(() => {
      startPolling();
      return () => stopPolling();
    }, [startPolling, stopPolling])
  );

  const connected = [...sessions].sort(
    (a, b) => new Date(b.connected_at).getTime() - new Date(a.connected_at).getTime()
  );

  const phoneModel = Device.modelName ?? 'This device';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <GradientText style={styles.title}>Peers</GradientText>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        testID="peers-scroll"
      >
        <View style={styles.ownCard} testID="own-device-card">
          <Ionicons name="phone-portrait-outline" size={24} color={colours.gold} />
          <View style={styles.ownInfo}>
            <Text style={styles.ownName} numberOfLines={1}>
              {phoneModel}
            </Text>
            <Text style={styles.ownLabel}>This device</Text>
          </View>
          <View style={styles.ownBadge}>
            <Text style={styles.ownBadgeText}>MARS</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Connected desktops</Text>

        {connected.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="desktop-outline" size={40} color={colours.purpleMid} />
            <Text style={styles.emptyText}>No desktops connected.</Text>
            <Text style={styles.emptyHint}>
              Make sure adtp-peer is running on your PC.
            </Text>
          </View>
        ) : (
          connected.map((s) => <PeerCard key={s.peer_id} session={s} />)
        )}

        {loading ? (
          <ActivityIndicator color={colours.gold} style={styles.loading} />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colours.bgDeep,
  },
  flex: {
    flex: 1,
  },
  header: {
    height: 56,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    backgroundColor: colours.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: colours.purpleDim,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Audiowide',
  },
  content: {
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  ownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    backgroundColor: colours.bgSurface,
    borderWidth: 1,
    borderColor: colours.goldDim,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  ownInfo: {
    flex: 1,
  },
  ownName: {
    color: colours.textPrimary,
    fontSize: fontSizes.md,
    fontFamily: 'Offside',
  },
  ownLabel: {
    color: colours.textMuted,
    fontSize: 12,
    fontFamily: 'Offside',
    marginTop: 2,
  },
  ownBadge: {
    borderWidth: 1,
    borderColor: colours.gold,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  ownBadgeText: {
    color: colours.gold,
    fontSize: fontSizes.xs,
    fontFamily: 'Audiowide',
    letterSpacing: 1,
  },
  sectionTitle: {
    color: colours.textSecondary,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  emptyCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colours.bgSurface,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    borderRadius: radii.md,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    color: colours.textSecondary,
    fontSize: fontSizes.md,
    fontFamily: 'Offside',
  },
  emptyHint: {
    color: colours.textMuted,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
    textAlign: 'center',
  },
  loading: {
    marginTop: spacing.xl,
  },
  error: {
    color: colours.ember,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});
