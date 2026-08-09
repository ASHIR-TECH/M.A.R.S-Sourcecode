import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Badge } from './Badge';
import { ToolCallStep } from './ToolCallStep';
import { LoadingBubble } from './LoadingBubble';
import { colours, fontSizes, radii, spacing } from '@/constants/colours';
import { formatBytes } from '@/lib/format';
import type { FileRef, ToolCallStep as ToolCallStepType } from '@/api/types';

export type MessageRole = 'user' | 'agent' | 'system';

interface ChatMessageProps {
  role: MessageRole;
  content: string;
  toolCalls?: ToolCallStepType[];
  fileRefs?: FileRef[];
  loading?: boolean;
  /** Tool name shown above the loading bubble while the agent runs a tool. */
  toolHint?: string | null;
  onPressFile?: (transferId: string) => void;
}

const ENTRANCE_MS = 200;

/** A single message — user, agent or system — with optional tool steps and file tiles. */
export function ChatMessage({
  role,
  content,
  toolCalls,
  fileRefs,
  loading,
  toolHint,
  onPressFile,
}: ChatMessageProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: ENTRANCE_MS, easing: Easing.out(Easing.ease) });
    translateY.value = withTiming(0, { duration: ENTRANCE_MS, easing: Easing.out(Easing.ease) });
  }, [opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (role === 'system') {
    return (
      <Animated.View style={[styles.systemRow, animatedStyle]} testID="message-system">
        <Text style={styles.systemText}>{content}</Text>
      </Animated.View>
    );
  }

  const isUser = role === 'user';

  return (
    <Animated.View
      style={[styles.container, isUser ? styles.containerUser : styles.containerAgent, animatedStyle]}
    >
      {isUser ? (
        <View style={[styles.bubble, styles.bubbleUser]}>
          <Text style={styles.userText}>{content}</Text>
        </View>
      ) : (
        <View style={[styles.bubble, styles.bubbleAgent]}>
          {loading ? (
            <LoadingBubble toolName={toolHint} />
          ) : (
            <>
              {toolCalls && toolCalls.length > 0
                ? toolCalls.map((step, i) => <ToolCallStep key={i} step={step} />)
                : null}
              {content ? <Text style={styles.agentText}>{content}</Text> : null}
            </>
          )}
          {fileRefs && fileRefs.length > 0 ? (
            <View style={styles.fileList}>
              {fileRefs.map((file, i) => (
                <FileTile key={i} file={file} onPressFile={onPressFile} />
              ))}
            </View>
          ) : null}
        </View>
      )}
    </Animated.View>
  );
}

function FileTile({
  file,
  onPressFile,
}: {
  file: FileRef;
  onPressFile?: (transferId: string) => void;
}) {
  const hasTarget = Boolean(file.transfer_id) && typeof onPressFile === 'function';
  return (
    <Pressable
      onPress={hasTarget ? () => onPressFile(file.transfer_id!) : undefined}
      disabled={!hasTarget}
      style={styles.fileTile}
      testID="file-tile"
      accessibilityRole="button"
    >
      <Ionicons name="document-outline" size={18} color={colours.gold} />
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {file.filename}
        </Text>
        <Text style={styles.fileMeta} numberOfLines={1}>
          {file.size != null ? formatBytes(file.size) : ''}
          {file.peer ? ` · ${file.peer}` : ''}
        </Text>
      </View>
      {hasTarget ? (
        <View style={styles.fileAction}>
          <Text style={styles.fileActionText}>View Details</Text>
          <Ionicons name="chevron-forward" size={14} color={colours.gold} />
        </View>
      ) : (
        <Badge label="Delivered" variant="Delivered" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
    maxWidth: '78%',
  },
  containerUser: {
    alignSelf: 'flex-end',
  },
  containerAgent: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  bubbleUser: {
    backgroundColor: `${colours.gold}26`,
    borderWidth: 1,
    borderColor: colours.gold,
  },
  bubbleAgent: {
    backgroundColor: colours.bgElevated,
  },
  userText: {
    color: colours.textPrimary,
    fontSize: 14,
    fontFamily: 'Offside',
    lineHeight: 20,
  },
  agentText: {
    color: colours.textSecondary,
    fontSize: 14,
    fontFamily: 'Offside',
    lineHeight: 21,
  },
  systemRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  systemText: {
    color: colours.textMuted,
    fontSize: 12,
    fontFamily: 'Offside',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  fileList: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  fileTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colours.bgOverlay,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    borderRadius: radii.md,
    padding: spacing.sm,
    minHeight: 44,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    color: colours.textPrimary,
    fontSize: 14,
    fontFamily: 'Offside',
  },
  fileMeta: {
    color: colours.textMuted,
    fontSize: 12,
    fontFamily: 'Offside',
    marginTop: 2,
  },
  fileAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fileActionText: {
    color: colours.gold,
    fontSize: 12,
    fontFamily: 'Offside',
  },
});
