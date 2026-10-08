import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { ChatMessage } from '../types/chatMessage';
import { TypeWriterText } from './TypeWriterText';
import { AttachmentCard } from './AttachmentCard';
import { ProviderBadge } from './ProviderBadge';
import { CopyMessageButton } from './CopyMessageButton';
import { ToolCallStep } from './ToolCallStep';
import { TransferFileTile } from './TransferFileTile';
import { MarkdownText } from './MarkdownText';
import { MarsLogo } from './icons/MarsLogo';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { glass } from '../theme/glass';
import { spacing } from '../theme/spacing';

function ChatBubbleBase({ message }: { message: ChatMessage }) {
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
        {!isUser && (
          <BlurView intensity={glass.intensity} tint={glass.tint} experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
        )}
        {message.attachment && (
          <AttachmentCard attachment={message.attachment} size="bubble" />
        )}
        {message.text.length > 0 &&
          (!isUser && message.typing ? (
            <TypeWriterText text={message.text} style={[styles.text, styles.textAi]} />
          ) : (
            <MarkdownText text={message.text} style={[styles.text, isUser ? styles.textOnGlass : styles.textAi]} />
          ))}
        {!isUser &&
          message.transfers?.map((transfer, index) => (
            <TransferFileTile key={`${transfer.fileName}-${index}`} transfer={transfer} />
          ))}
        {!isUser &&
          message.toolCalls?.map((call, index) => (
            <ToolCallStep key={call.id ?? `${call.name}-${index}`} call={call} />
          ))}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Text style={[styles.timestamp, isUser && styles.timestampUser]}>{time}</Text>
            {!isUser && message.text.length > 0 && (
              <CopyMessageButton text={message.text} />
            )}
          </View>
          {!isUser && (
            <View style={styles.footerRight}>
              <ProviderBadge label={message.providerLabel} viaFallback={message.viaFallback} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

/** Memoized: the thread re-renders whenever any message changes, but only the
 * bubble whose `message` object actually changed should repaint. */
export const ChatBubble = React.memo(ChatBubbleBase);

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.md, marginVertical: spacing.xs + 2, alignItems: 'flex-end', flexDirection: 'row', gap: spacing.sm },
  rowUser: { alignItems: 'flex-end', flexDirection: 'row-reverse' },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(232,163,77,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '84%',
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md + 2,
    paddingBottom: spacing.sm + 2,
    overflow: 'hidden',
    flexShrink: 1,
  },
  // Asymmetric radii = speech-bubble feel; the near-zero corner sits where the
  // tail would be (top-right for user on the right, top-left for AI on the left).
  bubbleShapeRight: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  bubbleShapeLeft: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  bubbleAi: {
    backgroundColor: 'rgba(20, 12, 6, 0.96)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 163, 77, 0.5)',
  },
  bubbleUser: {
    backgroundColor: '#E8A34D',
    borderWidth: 0,
  },
  text: { color: colors.textPrimary, fontSize: 14, fontFamily: fonts.montserrat, lineHeight: 20 },
  textOnGlass: { color: '#000000', fontWeight: '600' },
  textAi: { color: '#FFFFFF' },
  timestamp: { color: '#FFFFFF', fontSize: 10, marginTop: 4, fontFamily: fonts.montserrat, opacity: 0.75 },
  timestampUser: { color: '#000000', fontSize: 10, marginTop: 4, fontFamily: fonts.montserrat, opacity: 0.9 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: 2 },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
