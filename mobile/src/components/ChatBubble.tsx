import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChatMessage } from '../types/chatMessage';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.sender === 'user';
  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
        <Text style={styles.text}>{message.text}</Text>
        <Text style={styles.timestamp}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.md, marginVertical: spacing.xs, alignItems: 'flex-start' },
  rowUser: { alignItems: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: 14, padding: spacing.sm },
  bubbleAi: { backgroundColor: 'rgba(255,255,255,0.06)' },
  bubbleUser: { backgroundColor: colors.accent },
  text: { color: colors.textPrimary, fontSize: 14 },
  timestamp: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
});
