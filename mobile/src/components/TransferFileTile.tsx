import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { TransferReference } from '../desktop/types';
import { InboxFile } from '../desktop/deviceClient';
import { useDesktopStore } from '../store/useDesktopStore';
import { useInboxStore } from '../store/useInboxStore';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { spacing } from '../theme/spacing';

function formatBytes(bytes?: number): string {
  if (bytes == null) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

type DownloadState = 'idle' | 'downloading' | 'saved' | 'error';

/** Compact file tile under an AI reply that references a completed transfer
 * (PHASE_14 §Chat). Files the AI sent to this phone carry a device-file id and
 * can be downloaded straight from the chat into the MARS inbox. */
export function TransferFileTile({ transfer }: { transfer: TransferReference }) {
  const connection = useDesktopStore((s) => s.connection);
  const [downloadState, setDownloadState] = useState<DownloadState>('idle');
  const [error, setError] = useState<string>();

  const glyph = transfer.direction === 'incoming' ? '↓' : '↑';
  const line = [
    transfer.direction === 'incoming' ? 'from' : 'to',
    transfer.peerName,
    formatBytes(transfer.sizeBytes),
  ]
    .filter(Boolean)
    .join(' · ');
  const canDownload = Boolean(transfer.deviceFileId && connection);

  const handleDownload = useCallback(async () => {
    if (!transfer.deviceFileId || !connection || downloadState === 'downloading') return;
    setDownloadState('downloading');
    setError(undefined);
    const file: InboxFile = {
      id: transfer.deviceFileId,
      deviceId: transfer.deviceId ?? '',
      filename: transfer.fileName,
      fileSize: transfer.sizeBytes ?? 0,
      mimeType: transfer.mimeType ?? 'application/octet-stream',
      sha256: '',
      createdAt: new Date().toISOString(),
    };
    try {
      await useInboxStore.getState().download(connection, file);
      setDownloadState('saved');
    } catch (downloadError) {
      setDownloadState('error');
      setError(downloadError instanceof Error ? downloadError.message : 'Download failed.');
    }
  }, [connection, downloadState, transfer]);

  const hint = (() => {
    if (downloadState === 'downloading') return 'downloading…';
    if (downloadState === 'saved') return 'saved to MARS';
    if (downloadState === 'error') return error ?? 'download failed';
    if (transfer.deviceFileId && !connection) return 'pair a desktop to download';
    if (canDownload) return 'tap to download';
    return transfer.result ?? '';
  })();

  const body = (
    <View style={styles.tile}>
      <View style={styles.glyphWrap}>
        {downloadState === 'downloading' ? (
          <ActivityIndicator size="small" color="#FFC46B" />
        ) : (
          <Text style={styles.glyph}>{downloadState === 'saved' ? '✓' : glyph}</Text>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {transfer.fileName}
        </Text>
        <Text style={[styles.meta, downloadState === 'error' && styles.metaError]} numberOfLines={2}>
          {line}
          {hint ? ` — ${hint}` : ''}
        </Text>
      </View>
      {canDownload && downloadState === 'idle' && <Text style={styles.action}>Download</Text>}
    </View>
  );

  if (!canDownload) return body;

  return (
    <Pressable
      onPress={handleDownload}
      disabled={downloadState === 'downloading' || downloadState === 'saved'}
      accessibilityRole="button"
      accessibilityLabel={`Download ${transfer.fileName}`}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232,163,77,0.5)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: spacing.xs,
    alignSelf: 'stretch',
  },
  pressed: { opacity: 0.7 },
  glyphWrap: { width: 22, alignItems: 'center' },
  glyph: { fontSize: 16, color: '#FFC46B', textAlign: 'center' },
  body: { flex: 1 },
  name: { color: '#FFFFFF', fontSize: 13, fontFamily: fonts.montserrat, fontWeight: '600' },
  meta: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2, fontFamily: fonts.montserrat },
  metaError: { color: '#FF8A80' },
  action: {
    color: colors.accent,
    fontSize: 11,
    fontFamily: fonts.montserrat,
    fontWeight: '700',
  },
});
