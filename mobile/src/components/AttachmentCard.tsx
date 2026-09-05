import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { ChatAttachment } from '../types/chatMessage';
import { fonts } from '../theme/typography';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

function formatSize(bytes?: number): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function kindOf(attachment: ChatAttachment): { glyph: string; label: string } {
  const mime = attachment.mimeType ?? '';
  const name = attachment.name.toLowerCase();
  if (name.endsWith('.pdf')) return { glyph: '📄', label: 'PDF' };
  if (mime.startsWith('image/')) return { glyph: '🖼', label: 'Image' };
  if (mime.startsWith('video/')) return { glyph: '🎬', label: 'Video' };
  if (mime.startsWith('audio/')) return { glyph: '🎵', label: 'Audio' };
  if (mime.startsWith('text/')) return { glyph: '📄', label: 'Text' };
  return { glyph: '📁', label: 'File' };
}

interface AttachmentCardProps {
  attachment: ChatAttachment;
  /** 'preview' = physical template shown above the input before sending; 'bubble' = compact row inside the chat bubble */
  size: 'preview' | 'bubble';
  onRemove?: () => void;
}

export function AttachmentCard({ attachment, size, onRemove }: AttachmentCardProps) {
  const kind = kindOf(attachment);
  const sizeLabel = formatSize(attachment.size);

  if (size === 'bubble') {
    return (
      <View style={styles.bubbleCard}>
        <Text style={styles.linkIcon}>{'🔗'}</Text>
        <Text style={styles.bubbleName} numberOfLines={1}>
          {attachment.name}
        </Text>
        {sizeLabel.length > 0 && <Text style={styles.bubbleSize}>{sizeLabel}</Text>}
      </View>
    );
  }

  const isImage = kind.label === 'Image';

  return (
    <View style={styles.previewCard}>
      <View style={styles.previewIconBox}>
        {isImage && attachment.uri ? (
          <Image source={{ uri: attachment.uri }} style={styles.thumbnail} resizeMode="cover" />
        ) : (
          <Text style={styles.previewGlyph}>{kind.glyph}</Text>
        )}
      </View>
      <View style={styles.previewDetails}>
        <Text style={styles.previewName} numberOfLines={1}>
          {attachment.name}
        </Text>
        <Text style={styles.previewMeta}>
          {kind.label}
          {sizeLabel.length > 0 ? ` · ${sizeLabel}` : ''}
        </Text>
      </View>
      {onRemove && (
        <Pressable onPress={onRemove} style={styles.remove} accessibilityLabel="Remove attachment">
          <Text style={styles.removeIcon}>{'✕'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // --- pre-send physical preview template ---
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232,163,77,0.45)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 10,
    marginBottom: spacing.sm,
  },
  previewIconBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(232,163,77,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewGlyph: { fontSize: 24 },
  thumbnail: { width: '100%', height: '100%' },
  previewDetails: { flex: 1 },
  previewName: { color: colors.textPrimary, fontSize: 13, fontFamily: fonts.montserrat },
  previewMeta: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: fonts.montserrat, marginTop: 2 },
  remove: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIcon: { color: '#FFFFFF', fontSize: 10, lineHeight: 12 },

  // --- compact row shown inside the chat bubble ---
  bubbleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: spacing.xs,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  linkIcon: { fontSize: 13, color: '#FFC46B' },
  bubbleName: { color: '#FFFFFF', fontSize: 13, fontFamily: fonts.montserrat, flexShrink: 1 },
  bubbleSize: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: fonts.montserrat },
});