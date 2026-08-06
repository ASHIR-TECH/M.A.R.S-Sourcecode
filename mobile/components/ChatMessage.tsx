import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from './Badge';
import { ToolCallStep } from './ToolCallStep';
import { colours, fontSizes, radii, spacing } from '@/constants/colours';
import { formatBytes } from '@/lib/format';
import type { FileRef, ToolCallStep as ToolCallStepType } from '@/api/types';

interface ChatMessageProps {
  role: 'user' | 'agent';
  content: string;
  toolCalls?: ToolCallStepType[];
  fileRefs?: FileRef[];
  loading?: boolean;
  /** Tool name shown above the loading bubble while the agent runs a tool. */
  toolHint?: string | null;
  onPressFile?: (transferId: string) => void;
}

/** A single message bubble — user or agent — with optional tool steps and file tiles. */
export function ChatMessage({
  role,
  content,
  toolCalls,
  fileRefs,
  loading,
  toolHint,
  onPressFile,
}: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <View style={[styles.container, isUser ? styles.containerUser : styles.containerAgent]}>
      {isUser ? (
        <View style={[styles.bubble, styles.bubbleUser]}>
          <Text style={styles.userText}>{content}</Text>
        </View>
      ) : (
        <View style={[styles.bubble, styles.bubbleAgent]}>
          {toolCalls && toolCalls.length > 0
            ? toolCalls.map((step, i) => <ToolCallStep key={i} step={step} />)
            : null}
          {loading ? (
            <View>
              {toolHint ? (
                <View style={styles.toolRow}>
                  <Ionicons name="sync" size={12} color={colours.purpleMuted} />
                  <Text style={styles.toolHint}>Executing {toolHint}…</Text>
                </View>
              ) : null}
              <View style={styles.loadingRow}>
                <View style={styles.pulseDot} />
                <View style={styles.pulseDot} />
                <View style={styles.pulseDot} />
              </View>
            </View>
          ) : (
            <Text style={styles.agentText}>{content}</Text>
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
    </View>
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
          <Text style={styles.fileActionText}>View</Text>
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
    maxWidth: '85%',
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
    backgroundColor: colours.gold,
    borderBottomRightRadius: radii.sm,
  },
  bubbleAgent: {
    backgroundColor: colours.bgSurface,
    borderColor: colours.purpleDim,
    borderWidth: 1,
    borderBottomLeftRadius: radii.sm,
  },
  userText: {
    color: colours.textOnGold,
    fontSize: fontSizes.md,
    fontFamily: 'Offside',
  },
  agentText: {
    color: colours.textSecondary,
    fontSize: fontSizes.md,
    fontFamily: 'Offside',
    lineHeight: 22,
  },
  loadingRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: spacing.xs,
  },
  toolHint: {
    color: colours.purpleMuted,
    fontSize: 12,
    fontFamily: 'Offside',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colours.gold,
  },
  fileList: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  fileTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colours.bgSurfaceAlt,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    color: colours.textPrimary,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
  },
  fileMeta: {
    color: colours.textSecondary,
    fontSize: fontSizes.xs,
    fontFamily: 'Offside',
    marginTop: 2,
  },
  fileAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  fileActionText: {
    color: colours.gold,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
  },
});
