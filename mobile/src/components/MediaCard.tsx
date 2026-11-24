import React from 'react';
import { View, Text, Image, Pressable, Linking, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { spacing } from '../theme/spacing';
import type { MediaRef } from '../media/types';
import { mediaDownloadUrl, mediaOriginalUrl, mediaThumbnailUrl } from '../media/urls';

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

function open(url: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  void Linking.openURL(url).catch(() => {});
}

/**
 * Recipient-side render of blob media: a thumbnail (when one was generated)
 * plus an explicit download link. Works for both user-sent and AI/ADTP-sent
 * messages because both only carry a MediaRef.
 */
export function MediaCard({ media }: { media: MediaRef }) {
  const thumbnailUrl = mediaThumbnailUrl(media);
  const sizeLabel = formatSize(media.compressedSize || media.size);

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => open(mediaOriginalUrl(media))}
        style={styles.thumbBox}
        accessibilityLabel="Open media"
      >
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <Text style={styles.glyph}>{glyphFor(media.mimeType)}</Text>
        )}
      </Pressable>

      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={1}>
          {media.name}
        </Text>
        <Text style={styles.meta}>
          {sizeLabel}
          {media.compressed ? ' · compressed' : ''}
        </Text>
        <Pressable
          onPress={() => open(mediaDownloadUrl(media))}
          style={styles.download}
          accessibilityLabel={`Download ${media.name}`}
        >
          <Ionicons name="download-outline" size={13} color="#FFC46B" />
          <Text style={styles.downloadText}>Download</Text>
        </Pressable>
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
  download: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  downloadText: { color: '#FFC46B', fontSize: 12, fontFamily: fonts.montserrat },
});
