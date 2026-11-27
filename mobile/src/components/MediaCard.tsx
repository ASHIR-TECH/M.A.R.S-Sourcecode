import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { spacing } from '../theme/spacing';
import type { MediaRef } from '../media/types';
import {
  isMediaUnavailable,
  mediaOriginalUrl,
  mediaThumbnailUrl,
  mediaThroughDesktop,
} from '../media/urls';
import { storedSizeOf } from '../media/types';
import { downloadMedia } from '../media/download';
import { useDesktopStore } from '../store/useDesktopStore';

function formatSize(bytes?: number): string {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function glyphFor(mimeType: string): string {
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('pdf')) return '📄';
  return '📎';
}

type DownloadState = 'idle' | 'downloading' | 'saved' | 'error';

/**
 * Recipient-side render of blob media. Tapping either the preview or Download
 * saves the file inside the app; no external browser/Linking.openURL is used.
 */
export function MediaCard({ media }: { media: MediaRef }) {
  const [downloadState, setDownloadState] = useState<DownloadState>('idle');
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const desktopBaseUrl = useDesktopStore((s) => s.connection?.baseUrl);

  // A loopback service URL from ADTP must be rewritten at render time too: the
  // desktop connection may have been restored after the message was stored.
  const ref = mediaThroughDesktop(media, desktopBaseUrl) ?? media;
  const unavailable = isMediaUnavailable(ref);
  const thumbnailUrl = !unavailable && !thumbnailFailed ? mediaThumbnailUrl(ref) : null;
  const sizeLabel = formatSize(storedSizeOf(ref) || ref.size);

  const download = async () => {
    if (unavailable || downloadState === 'downloading') return;
    setDownloadState('downloading');
    try {
      await downloadMedia(ref);
      setDownloadState('saved');
    } catch {
      setDownloadState('error');
    }
  };

  const statusLabel =
    unavailable === 'expired'
      ? 'Media expired'
      : unavailable === 'deleted'
        ? 'Media unavailable'
        : downloadState === 'downloading'
          ? 'Downloading…'
          : downloadState === 'saved'
            ? 'Saved to Mars'
            : downloadState === 'error'
              ? 'Download failed — tap to retry'
              : `${sizeLabel}${ref.compressed ? ' · compressed' : ''}`;

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => void download()}
        disabled={Boolean(unavailable)}
        style={styles.thumbBox}
        accessibilityLabel={`Download ${ref.name}`}
      >
        {thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.thumb}
            resizeMode="cover"
            onError={() => setThumbnailFailed(true)}
          />
        ) : (
          <Text style={styles.glyph}>{glyphFor(ref.mimeType)}</Text>
        )}
      </Pressable>

      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={1}>
          {ref.name}
        </Text>
        <Text
          style={[
            styles.meta,
            (unavailable || downloadState === 'error') && styles.metaUnavailable,
            downloadState === 'saved' && styles.metaSaved,
          ]}
        >
          {statusLabel}
        </Text>
        {!unavailable && (
          <Pressable
            onPress={() => void download()}
            disabled={downloadState === 'downloading'}
            style={styles.download}
            accessibilityLabel={`Download ${ref.name}`}
          >
            <Ionicons name="download-outline" size={13} color="#FFC46B" />
            <Text style={styles.downloadText}>
              {downloadState === 'downloading' ? 'Downloading…' : 'Download'}
            </Text>
          </Pressable>
        )}
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
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  thumbBox: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232,163,77,0.18)',
  },
  thumb: { width: '100%', height: '100%' },
  glyph: { fontSize: 24 },
  details: { flexShrink: 1, gap: 2 },
  name: { color: colors.textPrimary, fontSize: 13, fontFamily: fonts.montserrat },
  meta: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: fonts.montserrat },
  metaUnavailable: { color: '#FFC46B' },
  metaSaved: { color: '#55ff00c9' },
  download: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  downloadText: { color: '#FFC46B', fontSize: 12, fontFamily: fonts.montserrat },
});
