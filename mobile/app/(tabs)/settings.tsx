import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/contexts/AuthContext';
import { getAgentStatus, type AgentStatus } from '@/api/client';
import { colors, FONTS } from '@/constants/brand';

export default function SettingsScreen() {
  const { displayName, email, apiUrl, signOut } = useAuth();
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);

  const load = useCallback(async () => {
    const { data } = await getAgentStatus();
    if (data) setAgentStatus(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sections = [
    {
      title: 'ACCOUNT',
      rows: [
        { label: 'Profile', value: displayName || '--' },
        { label: 'Email', value: email || '--' },
        { label: 'Status', value: 'Active' },
      ],
    },
    {
      title: 'SECURITY',
      rows: [
        { label: 'Authentication', value: 'OAuth' },
        { label: 'E2E Encryption', value: 'AES-256-GCM' },
        { label: 'Trust Store', value: 'TOFU' },
      ],
    },
    {
      title: 'CONNECTION',
      rows: [
        { label: 'API URL', value: apiUrl ? truncateUrl(apiUrl) : '--' },
        { label: 'Protocol', value: 'HTTPS' },
        { label: 'NAT Type', value: '--' },
      ],
    },
    {
      title: 'AGENT',
      rows: [
        { label: 'Provider', value: agentStatus?.provider?.toUpperCase() || '--' },
        { label: 'Model', value: agentStatus?.model || '--' },
        { label: 'Status', value: agentStatus?.status?.toUpperCase() || '--' },
      ],
    },
  ];

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SETTINGS</Text>
          <Text style={styles.headerSub}>System configuration</Text>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>### {section.title}</Text>
            <View style={styles.sectionCard}>
              {section.rows.map((row, i) => (
                <React.Fragment key={row.label}>
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>{row.label}</Text>
                    <Text style={styles.rowValue}>{row.value}</Text>
                  </View>
                  {i < section.rows.length - 1 && <View style={styles.rowDivider} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: '#e85d4a' }]}>Sign Out</Text>
              <Text style={styles.rowValue}>→</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function truncateUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.port ? ':' + u.port : ''}`;
  } catch {
    return url.length > 20 ? url.slice(0, 20) + '...' : url;
  }
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
  section: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: FONTS.quanticoBold,
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    opacity: 0.5,
    marginBottom: 10,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowLabel: {
    fontFamily: FONTS.geist,
    fontSize: 14,
    color: colors.text,
  },
  rowValue: {
    fontFamily: FONTS.jetbrains,
    fontSize: 12,
    color: colors.text,
    opacity: 0.6,
  },
  rowDivider: {
    height: 0.5,
    backgroundColor: colors.border,
    opacity: 0.5,
  },
});
