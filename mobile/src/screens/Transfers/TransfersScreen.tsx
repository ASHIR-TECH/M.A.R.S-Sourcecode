import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { AppBackground } from '../../components/AppBackground';
import { useDesktopStore } from '../../store/useDesktopStore';
import { useTransferStore } from '../../store/useTransferStore';
import { SessionRecord, TransferRecord, WatcherRecord } from '../../desktop/types';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { styles } from './TransfersScreen.styles';

const POLL_INTERVAL_MS = 8000;

function formatBytes(bytes?: number): string {
  if (bytes == null) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function formatTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function statusTone(status: TransferRecord['status']): 'ok' | 'running' | 'bad' {
  if (status === 'completed') return 'ok';
  if (status === 'transferring' || status === 'queued' || status === 'negotiating') return 'running';
  return 'bad';
}

type Tone = 'ok' | 'running' | 'bad';

const PILL_BG = {
  ok: styles.statusOk,
  running: styles.statusRunning,
  bad: styles.statusBad,
} as const;
const PILL_TEXT = {
  ok: styles.statusOkText,
  running: styles.statusRunningText,
  bad: styles.statusBadText,
} as const;

function TransferRowBase({ transfer }: { transfer: TransferRecord }) {
  const tone = statusTone(transfer.status);
  const glyph = transfer.direction === 'incoming' ? '↓' : '↑';
  const meta = [
    transfer.direction === 'incoming' ? 'from' : 'to',
    transfer.peerName || transfer.peerId,
    formatBytes(transfer.sizeBytes),
    formatTime(transfer.completedAt ?? transfer.startedAt),
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={styles.row}>
      <Text style={styles.rowGlyph}>{glyph}</Text>
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>
          {transfer.fileName}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <View style={[styles.statusPill, PILL_BG[tone]]}>
        <Text style={PILL_TEXT[tone]}>
          {transfer.status === 'transferring'
            ? `${Math.round(transfer.progress * 100)}%`
            : transfer.status}
        </Text>
      </View>
    </View>
  );
}

function SessionRowBase({ session }: { session: SessionRecord }) {
  const meta = [
    'active',
    session.transferCount != null ? `${session.transferCount} transfers` : '',
    session.bytesTransferred != null ? formatBytes(session.bytesTransferred) : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={styles.row}>
      <Text style={styles.rowGlyph}>●</Text>
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>
          {session.peerName || session.peerId}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
    </View>
  );
}

function WatcherRowBase({ watcher }: { watcher: WatcherRecord }) {
  const meta = [watcher.peerName || watcher.peerId, 'auto-receive'].filter(Boolean).join(' · ');
  return (
    <View style={styles.row}>
      <Text style={styles.rowGlyph}>👁</Text>
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>
          {watcher.path}
        </Text>
        <Text style={styles.rowMeta}>{meta}</Text>
      </View>
      <Text style={watcher.active ? styles.statusOkText : styles.rowMeta}>
        {watcher.active ? 'watching' : 'paused'}
      </Text>
    </View>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowMeta}>{label}</Text>
    </View>
  );
}

const TransferRow = React.memo(TransferRowBase);
const SessionRow = React.memo(SessionRowBase);
const WatcherRow = React.memo(WatcherRowBase);

/** Transfers tab (PHASE_14 §Transfers): polls the desktop's REST gateway for
 * recent transfers, active sessions and watchers. No transfer bytes ever touch
 * the phone — this is the remote-control view of P2P work the desktop did. */
export function TransfersScreen() {
  const connection = useDesktopStore((s) => s.connection);
  const hydrated = useDesktopStore((s) => s.hydrated);
  const hydrate = useDesktopStore((s) => s.hydrate);
  const { transfers, sessions, watchers, loading, refresh, clear } = useTransferStore();
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connected = !!connection?.baseUrl && !!connection?.token;

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrated, hydrate]);

  useEffect(() => {
    if (!connected) {
      clear();
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    void refresh(connection);
    pollRef.current = setInterval(() => void refresh(connection), POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [connected, connection, refresh, clear]);

  const onRefresh = useCallback(async () => {
    if (!connection) return;
    setRefreshing(true);
    await refresh(connection);
    setRefreshing(false);
  }, [connection, refresh]);

  // Rebuilt only when the underlying records change, so the poll's periodic
  // store writes don't remount every row on unrelated renders.
  const listData: { key: string; node: React.ReactElement }[] = useMemo(
    () => [
      { key: 'x', node: <Text style={styles.sectionLabel}>Recent Transfers ({transfers.length})</Text> },
      ...(transfers.length === 0
        ? [{ key: 'x-empty', node: <EmptyRow label="No transfers yet." /> }]
        : transfers.map((t) => ({ key: `t-${t.id}`, node: <TransferRow transfer={t} /> }))),
      { key: 'y', node: <Text style={styles.sectionLabel}>Connected Sessions ({sessions.length})</Text> },
      ...(sessions.length === 0
        ? [{ key: 'y-empty', node: <EmptyRow label="No active sessions." /> }]
        : sessions.map((s) => ({ key: `s-${s.id}`, node: <SessionRow session={s} /> }))),
      ...(watchers.length > 0
        ? [
            { key: 'z', node: <Text style={styles.sectionLabel}>Watch Folders ({watchers.length})</Text> },
            ...watchers.map((w) => ({ key: `w-${w.path}`, node: <WatcherRow watcher={w} /> })),
          ]
        : []),
    ],
    [transfers, sessions, watchers]
  );

  const renderItem = useCallback(
    ({ item }: { item: { key: string; node: React.ReactElement } }) => item.node,
    []
  );
  const keyExtractor = useCallback((item: { key: string }) => item.key, []);

  if (!connected) {
    return (
      <AppBackground blurred>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>TRANSFERS</Text>
          </View>
          <EmptyRow label="Scan your desktop's QR in the Devices tab to see transfers." />
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground blurred>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>TRANSFERS</Text>
        </View>

        <FlashList
          style={styles.list}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          refreshControl={
            <RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} tintColor={colors.accent} />
          }
          data={listData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
        />
      </View>
    </AppBackground>
  );
}