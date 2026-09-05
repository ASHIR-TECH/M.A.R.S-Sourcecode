import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { ChatMessage } from '../types/chatMessage';
import { TypeWriterText } from './TypeWriterText';
import { AttachmentCard } from './AttachmentCard';
import { MarsLogo } from './icons/MarsLogo';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { glass } from '../theme/glass';
import { spacing } from '../theme/spacing';

export function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.sender === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      {!isUser && (
        <View style={styles.aiAvatar}>
          <MarsLogo size={16} color={colors.accent} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAi,
          isUser ? styles.bubbleShapeRight : styles.bubbleShapeLeft,
        ]}
      >
        <BlurView intensity={glass.intensity} tint={glass.tint} style={StyleSheet.absoluteFill} />
        {message.attachment && (
          <AttachmentCard attachment={message.attachment} size="bubble" />
        )}
        {message.text.length > 0 &&
          (!isUser && message.typing ? (
            <TypeWriterText text={message.text} style={[styles.text, styles.textAi]} />
          ) : (
            <Text style={[styles.text, isUser ? styles.textOnGlass : styles.textAi]}>{message.text}</Text>
          ))}
        <Text style={[styles.timestamp, isUser && styles.timestampUser]}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.md, marginVertical: spacing.sm, alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm },
  rowUser: { alignItems: 'flex-end', flexDirection: 'row-reverse' },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(232,163,77,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    maxWidth: '82%',
    padding: spacing.md + 1,
    paddingBottom: spacing.sm + 8,
    overflow: 'hidden',
    flexShrink: 1,
  },
  // Asymmetric radii = speech-bubble feel; the near-zero corner sits where the
  // tail would be (top-right for user on the right, top-left for AI on the left).
  bubbleShapeRight: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  bubbleShapeLeft: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  bubbleAi: {
    backgroundColor: 'rgba(232, 163, 77, 0.25)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 163, 77, 0.7)',
  },
  bubbleUser: {
    backgroundColor: 'rgba(37, 17, 1, 0.38)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(215, 128, 30, 0.7)',
  },
  text: { color: colors.textPrimary, fontSize: 14, fontFamily: fonts.montserrat },
  textOnGlass: { color: '#FFFFFF' },
  textAi: { color: '#FFFFFF', fontWeight: 'bold' },
  timestamp: { color: 'rgba(255,255,255,0.75)', fontSize: 10, marginTop: 10, marginHorizontal: spacing.xs, textAlign: 'right', fontFamily: fonts.montserrat },
  timestampUser: { color: 'rgba(232,163,77,0.9)', marginTop: 10, marginHorizontal: spacing.xs, textAlign: 'right' },
});
