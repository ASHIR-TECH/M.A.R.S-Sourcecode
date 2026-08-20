import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, FONTS } from '@/constants/brand';

export default function DevicesScreen() {
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>DEVICE HUB</Text>
          <Text style={styles.headerSub}>All connected systems</Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="TOTAL" value="0" />
          <StatCard label="ONLINE" value="0" accent />
          <StatCard label="IDLE" value="0" />
        </View>

        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No devices paired yet</Text>
          <Text style={styles.emptyHint}>Scan a QR code to pair a device</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={[styles.statCard, accent && styles.statCardAccent]}>
      <Text style={[styles.statValue, accent && { color: colors.accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    paddingTop: 44,
    paddingBottom: 16,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 4,
  },
  headerTitle: {
    fontFamily: FONTS.quanticoBold,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerSub: {
    fontFamily: FONTS.geist,
    fontSize: 12,
    color: colors.text,
    opacity: 0.55,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statCardAccent: {
    borderColor: colors.accent,
  },
  statValue: {
    fontFamily: FONTS.jetbrains,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontFamily: FONTS.jetbrains,
    fontSize: 9,
    color: colors.text,
    opacity: 0.5,
  },
  emptyState: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontFamily: FONTS.geist,
    fontSize: 14,
    color: colors.text,
    opacity: 0.35,
  },
  emptyHint: {
    fontFamily: FONTS.geist,
    fontSize: 12,
    color: colors.text,
    opacity: 0.25,
  },
});
