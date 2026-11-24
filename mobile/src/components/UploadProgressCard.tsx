import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { useUploadStore, UploadItem } from '../store/useUploadStore';

const TICK_MS = 100;
/** Never let the simulated bar reach 100% before the upload actually resolves. */
const MAX_SIMULATED = 0.92;
const DISMISS_AFTER_MS = 1600;

function formatSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Live upload card: a preview, an animated progress bar and a countdown.
 *
 * The bar eases toward the estimate derived from the file size, then snaps to
 * 100% when the real upload resolves. If it runs long it parks just under 100%
 * rather than lying about completion.
 */
export function UploadProgressCard({ item }: { item: UploadItem }) {
  const dismiss = useUploadStore((s) => s.dismiss);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (item.status !== 'uploading') return;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [item.status]);

  useEffect(() => {
    if (item.status === 'uploading') return;
    const timer = setTimeout(() => dismiss(item.id), DISMISS_AFTER_MS);
    return () => clearTimeout(timer);
  }, [item.status, item.id, dismiss]);

  const { progress, secondsLeft } = useMemo(() => {
    const elapsed = Math.max(0, (now - item.startedAt) / 1000);
    const eta = Math.max(1, item.estimatedSeconds);
    const t = Math.min(1, elapsed / eta);
    // ease-out: fast start, slow finish — reads as real network progress.
    const simulated = (1 - Math.pow(1 - t, 2)) * MAX_SIMULATED;
    return {
      progress: item.status === 'sent' ? 1 : item.status === 'failed' ? Math.min(simulated, 0.55) : simulated,
      secondsLeft: Math.max(0, Math.ceil(eta - elapsed)),
    };
  }, [now, item.startedAt, item.estimatedSeconds, item.status]);

  const failed = item.status === 'failed';
  const sent = item.status === 'sent';
  const percent = Math.round(progress * 100);

  return (
    <View style={styles.card}>
      <View style={styles.thumbBox}>
        {item.uri ? (
          <Image source={{ uri: item.uri }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <Ionicons name="document-outline" size={20} color="#E8A34D" />
        )}
        <View style={styles.thumbOverlay}>
          <Ionicons
            name={failed ? 'alert-circle' : sent ? 'checkmark-circle' : 'cloud-upload-outline'}
            size={18}
            color={failed ? '#FF7A7A' : sent ? '#7BE0A3' : '#FFC46B'}
          />
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.percent, failed && styles.percentFailed]}>
            {failed ? '!' : `${percent}%`}
          </Text>
        </View>

        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${percent}%` },
              failed && styles.fillFailed,
              sent && styles.fillSent,
            ]}
          />
        </View>

        <Text style={[styles.status, failed && styles.statusFailed]}>
          {failed
            ? item.error || 'Upload failed'
            : sent
              ? 'Uploaded · sent'
              : `Uploading… ${secondsLeft}s${item.size ? ` · ${formatSize(item.size)}` : ''}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232,163,77,0.35)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    padding: 8,
    marginBottom: spacing.xs,
  },
  thumbBox: {
    width: 44,
    height: 44,
    borderRadius: 9,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232,163,77,0.18)',
  },
  thumb: { width: '100%', height: '100%' },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,7,4,0.55)',
  },
  body: { flex: 1, gap: 4 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1, color: colors.textPrimary, fontSize: 12.5, fontFamily: fonts.montserrat },
  percent: {
    color: '#FFC46B',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontFamily: fonts.montserrat,
  },
  percentFailed: { color: '#FF7A7A' },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  fill: { height: '100%', borderRadius: 2, backgroundColor: '#E8A34D' },
  fillSent: { backgroundColor: '#7BE0A3' },
  fillFailed: { backgroundColor: '#FF7A7A' },
  status: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10.5,
    fontVariant: ['tabular-nums'],
    fontFamily: fonts.montserrat,
  },
  statusFailed: { color: '#FF9A9A' },
});
