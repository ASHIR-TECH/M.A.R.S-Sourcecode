import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/contexts/AuthContext';
import { getSessions, getAgentStatus, type Session, type AgentStatus } from '@/api/client';
import { colors, FONTS } from '@/constants/brand';

export default function HomeScreen() {
  const { displayName } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);

  const load = useCallback(async () => {
    const [sessRes, agentRes] = await Promise.all([getSessions(), getAgentStatus()]);
    if (sessRes.data) setSessions(sessRes.data);
    if (agentRes.data) setAgentStatus(agentRes.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const initials = (displayName || 'OP')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BrandLogo width={56} color={colors.text} mirror />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>COMMAND CENTER</Text>
            <Text style={styles.headerSub}>SECURE CONNECTION ACTIVE</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <View style={styles.searchInput}>
            <Text style={styles.searchPlaceholder}>### Search active systems or peers...</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>### CONNECTED DEVICES</Text>
          {sessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No devices connected</Text>
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
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>### AI AGENT</Text>
          <View style={styles.agentCard}>
            <View style={styles.agentDot} />
            <View style={styles.agentInfo}>
              <Text style={styles.agentLabel}>
                {agentStatus?.status?.toUpperCase() || 'OFFLINE'}
              </Text>
              <Text style={styles.agentMeta}>
                {agentStatus ? `${agentStatus.provider} · ${agentStatus.model}` : 'Not connected'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomAnchor}>
        <TouchableOpacity style={styles.navBtn} onPress={() => {}}>
          <Text style={styles.navBtnIcon}>+</Text>
        </TouchableOpacity>
        <View style={styles.homeIndicator}>
          <View style={styles.indicatorBar} />
        </View>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontFamily: FONTS.jetbrains,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  headerSub: {
    fontFamily: FONTS.jetbrains,
    fontSize: 9,
    color: colors.text,
    opacity: 0.55,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.avatarBg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FONTS.jetbrains,
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  searchWrap: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  searchInput: {
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  searchPlaceholder: {
    fontFamily: FONTS.quanticoBold,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    opacity: 0.5,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: FONTS.quanticoBold,
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    opacity: 0.5,
    marginBottom: 12,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FONTS.geist,
    fontSize: 13,
    color: colors.text,
    opacity: 0.35,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 12,
    marginBottom: 8,
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
  agentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 12,
  },
  agentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  agentInfo: {
    flex: 1,
    gap: 2,
  },
  agentLabel: {
    fontFamily: FONTS.jetbrains,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  agentMeta: {
    fontFamily: FONTS.geist,
    fontSize: 11,
    color: colors.text,
    opacity: 0.5,
  },
  bottomAnchor: {
    alignItems: 'center',
  },
  navBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.navBtn,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.navBtn,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  navBtnIcon: {
    fontFamily: FONTS.jetbrains,
    fontSize: 24,
    fontWeight: '700',
    color: colors.bg,
  },
  homeIndicator: {
    height: 25,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  indicatorBar: {
    width: 139,
    height: 5,
    borderRadius: 100,
    backgroundColor: colors.text,
    opacity: 0.2,
  },
});
