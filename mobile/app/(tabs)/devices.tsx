import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getSessions, type Session } from '@/api/client';
import { colors, FONTS } from '@/constants/brand';

export default function DevicesScreen() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await getSessions();
    if (data) setSessions(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const online = sessions.length;
  const total = sessions.length;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>DEVICE HUB</Text>
          <Text style={styles.headerSub}>All connected systems</Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="TOTAL" value={String(total)} />
          <StatCard label="ONLINE" value={String(online)} accent />
          <StatCard label="IDLE" value="0" />
        </View>

        {sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No devices paired yet</Text>
            <Text style={styles.emptyHint}>Scan a QR code to pair a device</Text>
          </View>
        ) : (
          sessions.map((s) => (
            <View key={s.peer_id} style={styles.deviceCard}>
              <View style={styles.deviceDot} />
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{s.peer_name || s.peer_id.slice(0, 12)}</Text>
                <Text style={styles.deviceMeta}>
                  {s.nat_type} · {s.connection_path}
                </Text>
                <Text style={styles.deviceId}>ID: {s.peer_id}</Text>
              </View>
            </View>
          ))
        )}
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
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 8,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 12,
  },
  deviceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  deviceInfo: {
    flex: 1,
    gap: 2,
  },
  deviceName: {
    fontFamily: FONTS.jetbrains,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  deviceMeta: {
    fontFamily: FONTS.geist,
    fontSize: 11,
    color: colors.text,
    opacity: 0.5,
  },
  deviceId: {
    fontFamily: FONTS.jetbrains,
    fontSize: 10,
    color: colors.text,
    opacity: 0.3,
  },
});
