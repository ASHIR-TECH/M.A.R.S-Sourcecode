import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { ChatPreview } from '../types/chat';
import { colors } from '../theme/colors';
import { glass } from '../theme/glass';
import { spacing } from '../theme/spacing';

interface ChatPreviewRowProps {
  chat: ChatPreview;
  onPress?: (chat: ChatPreview) => void;
}

export function ChatPreviewRow({ chat, onPress }: ChatPreviewRowProps) {
  return (
    <Pressable
      onPress={() => onPress?.(chat)}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`Chat with ${chat.name}`}
    >
      <BlurView intensity={glass.intensity} tint={glass.tint} style={StyleSheet.absoluteFill} />
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{chat.initials}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{chat.name}</Text>
          <Text style={styles.timestamp}>{chat.timestamp}</Text>
        </View>
        <Text style={styles.message} numberOfLines={1}>
          {chat.lastMessage}
        </Text>
      </View>
      {chat.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{chat.unreadCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 17, 1, 0.62)',
    borderRadius: glass.radius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(247, 247, 246, 0.7)',
    padding: spacing.md,
    height: 68,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.textPrimary, fontWeight: '700', fontSize: 12 },
  body: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { color: colors.textPrimary, fontWeight: '600', fontSize: 14 },
  timestamp: { color: colors.textMuted, fontSize: 11 },
  message: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  unreadBadge: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadText: { color: '#0B0704', fontSize: 11, fontWeight: '700' },
});
