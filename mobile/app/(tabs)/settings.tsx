import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, FONTS } from '@/constants/brand';

const SECTIONS = [
  {
    title: 'ACCOUNT',
    rows: [
      { label: 'Profile', value: '--' },
      { label: 'Peer ID', value: '--' },
      { label: 'Status', value: '--' },
    ],
  },
  {
    title: 'SECURITY',
    rows: [
      { label: 'Authentication', value: '--' },
      { label: 'E2E Encryption', value: '--' },
      { label: 'Trust Store', value: '--' },
    ],
  },
  {
    title: 'CONNECTION',
    rows: [
      { label: 'Rendezvous', value: '--' },
      { label: 'Relay', value: '--' },
      { label: 'NAT Type', value: '--' },
    ],
  },
  {
    title: 'AGENT',
    rows: [
      { label: 'Provider', value: '--' },
      { label: 'Model', value: '--' },
      { label: 'Max Iterations', value: '--' },
    ],
  },
];

export default function SettingsScreen() {
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SETTINGS</Text>
          <Text style={styles.headerSub}>System configuration</Text>
        </View>

        {SECTIONS.map((section) => (
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

        <View style={{ height: 24 }} />
      </ScrollView>
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
