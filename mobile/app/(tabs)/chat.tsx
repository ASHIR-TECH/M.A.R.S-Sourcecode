import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ChatMessage } from '@/components/ChatMessage';
import { StatusBar } from '@/components/StatusBar';
import { colours, fontSizes, radii, spacing, touchTarget } from '@/constants/colours';
import { useAgent } from '@/contexts/AgentContext';
import { usePollAgent } from '@/hooks/usePollAgent';
import type { FileRef, ToolCallStep } from '@/api/types';

interface ChatEntry {
  id: string;
  role: 'user' | 'agent';
  content: string;
  loading?: boolean;
  error?: boolean;
  toolCalls?: ToolCallStep[];
  fileRefs?: FileRef[];
}

const SUGGESTIONS = ['What files did I receive today?', 'Send a file to my work PC'];

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ChatScreen() {
  const router = useRouter();
  const { sendMessage, sending } = useAgent();

  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState('');
  const [pollId, setPollId] = useState<string | null>(null);

  const listRef = useRef<FlatList<ChatEntry>>(null);
  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const { message, status: pollStatus, error: pollError } = usePollAgent(pollId);

  const runningTool =
    pollId && message
      ? message.tool_calls?.find((t) => t.status === 'running')?.tool_name ?? null
      : null;

  const replaceLoadingBubble = useCallback((entry: ChatEntry) => {
    setMessages((prev) => {
      const next = [...prev];
      let idx = -1;
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === 'agent' && next[i].loading) {
          idx = i;
          break;
        }
      }
      if (idx >= 0) next[idx] = entry;
      else next.push(entry);
      return next;
    });
  }, []);

  // Resolve the polled agent message into a rendered bubble.
  useEffect(() => {
    if (!pollId) return;
    if (pollStatus === 'resolved' && message) {
      replaceLoadingBubble({
        id: message.id,
        role: 'agent',
        content: message.message ?? '',
        toolCalls: message.tool_calls,
        fileRefs: message.file_refs,
      });
      setPollId(null);
      scrollToEnd();
    } else if (pollStatus === 'error') {
      replaceLoadingBubble({
        id: `error-${pollId}`,
        role: 'agent',
        content: pollError ?? 'The agent could not respond.',
        error: true,
      });
      setPollId(null);
    }
  }, [pollId, pollStatus, message, pollError, replaceLoadingBubble, scrollToEnd]);

  // Autoscroll on every message change.
  useEffect(() => {
    if (messages.length > 0) scrollToEnd();
  }, [messages, scrollToEnd]);

  const onSend = async () => {
    const text = input.trim();
    if (!text || sending || pollId) return;
    setInput('');
    setMessages((prev) => [
      ...prev,
      { id: makeId(), role: 'user', content: text },
      { id: makeId(), role: 'agent', content: '', loading: true },
    ]);
    try {
      const res = await sendMessage(text);
      setPollId(res.id);
    } catch {
      replaceLoadingBubble({
        id: `error-${makeId()}`,
        role: 'agent',
        content: 'Message not delivered. Check your connection to the desktop peer.',
        error: true,
      });
    }
  };

  const openFile = useCallback(
    (transferId: string) => {
      router.push(`/transfer/${transferId}`);
    },
    [router]
  );

  return (
    <View style={styles.screen}>
      <StatusBar />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.wordmark}>ADTP</Text>
            <Text style={styles.emptyTitle}>Ask your agent anything</Text>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setInput(s)}
                  style={({ pressed }) => [
                    styles.chip,
                    pressed && styles.chipPressed,
                  ]}
                >
                  <Text style={styles.chipText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatMessage
                role={item.role}
                content={item.content}
                toolCalls={item.toolCalls}
                fileRefs={item.fileRefs}
                loading={item.loading}
                toolHint={item.loading ? runningTool : null}
                onPressFile={openFile}
              />
            )}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={scrollToEnd}
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask your agent…"
            placeholderTextColor={colours.textSecondary}
            multiline
            editable={!sending}
            onSubmitEditing={onSend}
            blurOnSubmit={false}
          />
          <Pressable
            onPress={onSend}
            disabled={!input.trim() || sending}
            style={({ pressed }) => [
              styles.sendButton,
              (!input.trim() || sending) && styles.sendDisabled,
              pressed && styles.sendPressed,
            ]}
            hitSlop={8}
            accessibilityLabel="Send message"
          >
            <Ionicons
              name="arrow-up"
              size={20}
              color={colours.textOnGold}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colours.bgDeep,
  },
  flex: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  wordmark: {
    color: colours.gold,
    fontSize: 40,
    fontFamily: 'Audiowide',
    letterSpacing: 4,
  },
  emptyTitle: {
    color: colours.textSecondary,
    fontSize: fontSizes.md,
    fontFamily: 'Offside',
  },
  suggestions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
    width: '100%',
    alignItems: 'center',
  },
  chip: {
    backgroundColor: colours.bgSurface,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: touchTarget,
    justifyContent: 'center',
  },
  chipPressed: {
    borderColor: colours.gold,
  },
  chipText: {
    color: colours.purpleMuted,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colours.bgSurface,
    borderTopWidth: 1,
    borderTopColor: colours.purpleDim,
  },
  input: {
    flex: 1,
    backgroundColor: colours.bgSurfaceAlt,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    borderRadius: radii.lg,
    color: colours.textPrimary,
    fontSize: fontSizes.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxHeight: 120,
    minHeight: touchTarget,
    fontFamily: 'Offside',
  },
  sendButton: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: radii.lg,
    backgroundColor: colours.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendPressed: {
    opacity: 0.8,
  },
});
