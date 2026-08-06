import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { PeerRow } from '@/components/PeerRow';
import { StatusBar } from '@/components/StatusBar';
import { colours, fontSizes, radii, spacing } from '@/constants/colours';
import { getHealth } from '@/api/health';
import { listSessions } from '@/api/peers';
import type { HealthStatus, Session } from '@/api/types';

export default function PeersScreen() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [h, s] = await Promise.all([getHealth(), listSessions()]);
      setHealth(h);
      setSessions(s);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load peers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const ownPeerId = health?.peer_id ?? '';

  const copyPeerId = async () => {
    if (!ownPeerId) return;
    await Clipboard.setStringAsync(ownPeerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.screen}>
      <StatusBar />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        testID="peers-scroll"
      >
        <View style={styles.card}>
          <Text style={styles.cardWordmark}>ADTP</Text>
          <Text style={styles.cardLabel}>Your Peer ID</Text>
          <Pressable
            onPress={copyPeerId}
            disabled={!ownPeerId}
            style={styles.peerIdRow}
            accessibilityRole="button"
            accessibilityLabel="Copy your peer ID"
          >
            <Text style={styles.peerId} selectable>
              {ownPeerId || (loading ? '…' : '—')}
            </Text>
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={18}
              color={copied ? colours.success : colours.gold}
            />
          </Pressable>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              NAT: {health?.nat_type ?? 'unknown'}
            </Text>
            <Text style={styles.metaText}>
              Rendezvous: {health?.status ? 'reachable' : '—'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Connected Peers</Text>
        {sessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No peers connected.</Text>
            <Text style={styles.emptyHint}>
              Share your Peer ID with another ADTP user to connect.
            </Text>
          </View>
        ) : (
          sessions.map((s) => <PeerRow key={s.peer_id} session={s} />)
        )}

        {loading ? (
          <ActivityIndicator color={colours.gold} style={styles.loading} />
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </View>
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
  content: {
    paddingBottom: spacing.xl,
  },
  card: {
    margin: spacing.lg,
    backgroundColor: colours.bgSurface,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  cardWordmark: {
    color: colours.gold,
    fontSize: 24,
    fontFamily: 'Audiowide',
    letterSpacing: 3,
  },
  cardLabel: {
    color: colours.textSecondary,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
    marginTop: spacing.sm,
  },
  peerIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: colours.bgSurfaceAlt,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  peerId: {
    color: colours.textPrimary,
    fontSize: fontSizes.md,
    fontFamily: 'monospace',
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.md,
  },
  metaText: {
    color: colours.textSecondary,
    fontSize: fontSizes.xs,
    fontFamily: 'Offside',
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
  },
  emptyText: {
    color: colours.textPrimary,
    fontSize: fontSizes.md,
    fontFamily: 'Offside',
  },
  emptyHint: {
    color: colours.textSecondary,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  loading: {
    marginTop: spacing.xl,
  },
  error: {
    color: colours.danger,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
});
