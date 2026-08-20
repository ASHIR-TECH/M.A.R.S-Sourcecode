import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BrandLogo } from '@/components/BrandLogo';
import { colors, FONTS } from '@/constants/brand';

export default function HomeScreen() {
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
            <Text style={styles.avatarText}>OP</Text>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <View style={styles.searchInput}>
            <Text style={styles.searchPlaceholder}>### Search active systems or peers...</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>### CONNECTED DEVICES</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No devices connected</Text>
        </View>

        <View style={{ height: 24 }} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>### RECENT CHATS</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No recent activity</Text>
        </View>
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: FONTS.quanticoBold,
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    opacity: 0.5,
  },
  emptyState: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FONTS.geist,
    fontSize: 13,
    color: colors.text,
    opacity: 0.35,
  },
});
