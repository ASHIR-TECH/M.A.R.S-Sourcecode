import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { ChatMessage } from '../types/chatMessage';
import { TypeWriterText } from './TypeWriterText';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';
import { glass } from '../theme/glass';
import { spacing } from '../theme/spacing';

export function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.sender === 'user';
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
        <BlurView intensity={glass.intensity} tint={glass.tint} style={StyleSheet.absoluteFill} />
        {!isUser && message.typing ? (
          <TypeWriterText
            text={message.text}
            style={[styles.text, styles.textAi]}
          />
        ) : (
          <Text style={[styles.text, isUser ? styles.textOnGlass : styles.textAi]}>{message.text}</Text>
        )}
        <Text style={[styles.timestamp, isUser && styles.timestampUser]}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.md, marginVertical: spacing.md, alignItems: 'flex-start' },
  rowUser: { alignItems: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: 14, padding: spacing.sm, overflow: 'hidden' },
  bubbleAi: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(247, 247, 246, 0.7)',
  },
  bubbleUser: {
    backgroundColor: 'rgba(37, 17, 1, 0.38)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(215, 128, 30, 0.7)',
  },
  text: { color: colors.textPrimary, fontSize: 14, fontFamily: fonts.montserrat },
  textOnGlass: { color: '#FFFFFF' },
  textAi: { color: '#FFC46B' },
  timestamp: { color: colors.textMuted, fontSize: 10, marginTop: 4, marginHorizontal: spacing.xs, textAlign: 'right' },
  timestampUser: { color: 'rgba(232,163,77,0.9)', marginHorizontal: spacing.xs, textAlign: 'right' },
});
