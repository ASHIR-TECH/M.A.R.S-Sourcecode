import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '@/components/Badge';
import { colours, fontSizes, radii, spacing } from '@/constants/colours';
import { getTransfer, getTransferStatus } from '@/api/transfers';
import { formatBytes, formatTimestamp, shortPeerId } from '@/lib/format';
import type { TransferDetail } from '@/api/types';

const STATUS_POLL_MS = 500;

export default function TransferDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [transfer, setTransfer] = useState<TransferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setTransfer(await getTransfer(id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transfer.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Poll status every 500ms while the transfer is in progress.
  useEffect(() => {
    void load();
    let timer: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      try {
        const s = await getTransferStatus(id!);
        setTransfer((prev) => (prev ? { ...prev, status: s.status, progress: s.progress } : prev));
        if (s.status !== 'InProgress' && timer) {
          clearInterval(timer);
          timer = null;
        }
      } catch {
        // status endpoint may 404 for old transfers — stop polling
        if (timer) clearInterval(timer);
        timer = null;
      }
    };

    timer = setInterval(() => {
      void poll();
    }, STATUS_POLL_MS);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [id, load]);

  const inProgress = transfer?.status === 'InProgress';
  const percent =
    transfer?.progress && transfer.progress.total_bytes > 0
      ? Math.round((transfer.progress.bytes_sent / transfer.progress.total_bytes) * 100)
      : 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colours.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Transfer</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colours.gold} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={colours.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : transfer ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.filename}>{transfer.filename}</Text>
          <View style={styles.headerRow}>
            <Badge
              label={transfer.status}
              variant={transfer.status as 'Delivered' | 'Verified' | 'Pending' | 'InProgress' | 'Failed' | 'Cancelled' | 'Alerted'}
            />
            <Text style={styles.meta}>{shortPeerId(transfer.peer)}</Text>
            <Text style={styles.meta}>{formatTimestamp(transfer.timestamp)}</Text>
          </View>

          {inProgress ? (
            <View style={styles.progressCard}>
              <Text style={styles.progressLabel}>
                {percent}% · {transfer.progress ? formatBytes(transfer.progress.bytes_sent) : '0 B'} /{' '}
                {transfer.progress ? formatBytes(transfer.progress.total_bytes) : formatBytes(transfer.size)}
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.max(2, percent)}%` }]} />
              </View>
            </View>
          ) : null}

          {transfer.context ? <ContextCard context={transfer.context} /> : null}

          <View style={styles.auditCard}>
            <Text style={styles.auditTitle}>Audit entry</Text>
            <View style={styles.auditRow}>
              <Text style={styles.auditLabel}>Integrity</Text>
              <View style={styles.auditValueRow}>
                {transfer.integrity_ok ? (
                  <Ionicons name="shield-checkmark" size={16} color={colours.success} />
                ) : (
                  <Ionicons name="shield-outline" size={16} color={colours.textSecondary} />
                )}
                <Text style={[styles.auditValue, { color: transfer.integrity_ok ? colours.success : colours.textSecondary }]}>
                  {transfer.integrity_ok ? 'Verified' : 'Not verified'}
                </Text>
              </View>
            </View>
            {transfer.chain_hash ? (
              <TruncatedRow label="Chain hash" value={transfer.chain_hash} />
            ) : null}
            {transfer.signature ? (
              <TruncatedRow label="Signature" value={transfer.signature} />
            ) : null}
            {transfer.content_hash ? (
              <TruncatedRow label="Content hash" value={transfer.content_hash} />
            ) : null}
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

function ContextCard({ context }: { context: NonNullable<TransferDetail['context']> }) {
  return (
    <View style={styles.card}>
      <Text style={styles.auditTitle}>Context</Text>
      {context.schema ? (
        <Accordion title="Schema">
          <Text style={styles.accordionText}>{JSON.stringify(context.schema, null, 2)}</Text>
        </Accordion>
      ) : null}
      {context.agent_hint ? (
        <Accordion title="Agent Hint">
          <Text style={styles.accordionText}>{context.agent_hint}</Text>
        </Accordion>
      ) : null}
      {context.summary ? (
        <Accordion title="Summary">
          <Text style={styles.accordionText}>{context.summary}</Text>
        </Accordion>
      ) : null}
    </View>
  );
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.accordion}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={styles.accordionHeader}
        hitSlop={8}
      >
        <Text style={styles.accordionTitle}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colours.textSecondary} />
      </Pressable>
      {open ? <View style={styles.accordionBody}>{children}</View> : null}
    </View>
  );
}

function TruncatedRow({ label, value }: { label: string; value: string }) {
  const [expanded, setExpanded] = useState(false);
  const short = value.slice(0, 24);
  return (
    <View style={styles.auditRow}>
      <Text style={styles.auditLabel}>{label}</Text>
      <Pressable onPress={() => setExpanded((e) => !e)} hitSlop={8}>
        <Text style={styles.auditHash} selectable>
          {expanded ? value : `${short}…`}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colours.bgDeep,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colours.purpleDim,
    backgroundColor: colours.bgSurface,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: colours.textPrimary,
    fontSize: fontSizes.md,
    fontFamily: 'Audiowide',
  },
  headerSpacer: {
    width: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    color: colours.textSecondary,
    fontSize: fontSizes.sm,
    textAlign: 'center',
    fontFamily: 'Offside',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  filename: {
    color: colours.textPrimary,
    fontSize: 22,
    fontWeight: '600',
    fontFamily: 'Offside',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  meta: {
    color: colours.textSecondary,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
  },
  progressCard: {
    backgroundColor: colours.bgSurface,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  progressLabel: {
    color: colours.textSecondary,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colours.bgSurfaceAlt,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colours.gold,
  },
  card: {
    backgroundColor: colours.bgSurface,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  auditCard: {
    backgroundColor: colours.bgSurface,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  auditTitle: {
    color: colours.textPrimary,
    fontSize: fontSizes.md,
    fontFamily: 'Audiowide',
    marginBottom: spacing.xs,
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  auditLabel: {
    color: colours.textSecondary,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
  },
  auditValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  auditValue: {
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
  },
  auditHash: {
    color: colours.purpleMuted,
    fontSize: fontSizes.xs,
    fontFamily: 'monospace',
  },
  accordion: {
    backgroundColor: colours.bgSurfaceAlt,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  accordionTitle: {
    color: colours.textPrimary,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
  },
  accordionBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  accordionText: {
    color: colours.textSecondary,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
    lineHeight: 20,
  },
});
