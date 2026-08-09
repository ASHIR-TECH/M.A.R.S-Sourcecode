import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatMessage } from '@/components/ChatMessage';
import { StatusDot } from '@/components/StatusDot';
import { LoadingBubble } from '@/components/LoadingBubble';
import { colours, fontSizes, radii, spacing, touchTarget } from '@/constants/colours';
import { useAgent } from '@/contexts/AgentContext';
import { usePollAgent } from '@/hooks/usePollAgent';
import { useConnection } from '@/hooks/useConnection';
import { getAgentMessage } from '@/api/agent';
import { unread } from '@/lib/unread';
import type { AgentMessage, FileRef, ToolCallStep } from '@/api/types';

interface ChatEntry {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  loading?: boolean;
  queued?: boolean;
  error?: boolean;
  toolCalls?: ToolCallStep[];
  fileRefs?: FileRef[];
}

const SUGGESTIONS = ['What files did I receive today?', 'Send a file to my work PC'];

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const POLL_MS = 1000;
const MAX_POLL_MS = 120_000;

async function waitForCompletion(id: string): Promise<AgentMessage> {
  const startedAt = Date.now();
  for (;;) {
    const msg = await getAgentMessage(id);
    if (msg.status === 'completed' || msg.status === 'failed') return msg;
    if (Date.now() - startedAt > MAX_POLL_MS) {
      throw new Error('Timed out waiting for the agent response.');
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

export default function ChatScreen() {
  const router = useRouter();
  const { sendMessage, sending } = useAgent();
  const { isOnline, latencyMs } = useConnection();

  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState('');
  const [pollId, setPollId] = useState<string | null>(null);

  const listRef = useRef<FlashListRef<ChatEntry>>(null);
  const focusedRef = useRef(true);
  const queueRef = useRef<string[]>([]);
  const scrollingRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    if (scrollingRef.current) return;
    scrollingRef.current = true;
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
      setTimeout(() => {
        scrollingRef.current = false;
      }, 300);
    });
  }, []);

  const { message, status: pollStatus, error: pollError } = usePollAgent(pollId);

  const agentBusy = sending || pollId !== null;

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
      scrollToBottom();
      if (!focusedRef.current) unread.increment();
    } else if (pollStatus === 'error') {
      replaceLoadingBubble({
        id: `error-${pollId}`,
        role: 'agent',
        content: pollError ?? 'The agent could not respond.',
        error: true,
      });
      setPollId(null);
    }
  }, [pollId, pollStatus, message, pollError, replaceLoadingBubble, scrollToBottom]);

  // Autoscroll on every message change.
  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages, scrollToBottom]);

  // Track focus for the unread badge.
  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      unread.clear();
      return () => {
        focusedRef.current = false;
      };
    }, [])
  );

  const appendUserMessage = useCallback((text: string, queued: boolean) => {
    setMessages((prev) => [
      ...prev,
      { id: makeId(), role: 'user', content: text, queued },
    ]);
  }, []);

  const onSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || pollId) return;
    setInput('');
    appendUserMessage(text, false);
    try {
      const res = await sendMessage(text);
      setPollId(res.id);
    } catch {
      // Desktop unreachable — queue locally and send on reconnect.
      replaceLoadingBubble({
        id: makeId(),
        role: 'system',
        content: 'Queued — will send when reconnected.',
      });
      setMessages((prev) =>
        prev.map((m) => (m.content === text && m.role === 'user' ? { ...m, queued: true } : m))
      );
      queueRef.current.push(text);
    }
  }, [input, sending, pollId, sendMessage, appendUserMessage, replaceLoadingBubble]);

  // Flush the offline queue when the desktop comes back.
  useEffect(() => {
    if (!isOnline || queueRef.current.length === 0) return;
    const items = queueRef.current.splice(0);
    void (async () => {
      for (const text of items) {
        try {
          const res = await sendMessage(text);
          const msg = await waitForCompletion(res.id);
          appendUserMessage(text, false);
          setMessages((prev) => [
            ...prev,
            {
              id: msg.id,
              role: 'agent',
              content: msg.message ?? '',
              toolCalls: msg.tool_calls,
              fileRefs: msg.file_refs,
            },
          ]);
          if (!focusedRef.current) unread.increment();
        } catch {
          queueRef.current.unshift(text);
          return;
        }
      }
    })();
  }, [isOnline, sendMessage, appendUserMessage]);

  const openFile = useCallback(
    (transferId: string) => {
      router.push(`/transfer/${transferId}`);
    },
    [router]
  );

  const bannerVisible = isOnline === false;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>MARS</Text>
        <View style={styles.connection}>
          <StatusDot status={isOnline === false ? 'offline' : 'connected'} />
          <Text style={styles.latency}>{latencyMs != null ? `${latencyMs}ms` : '—'}</Text>
        </View>
      </View>

      {bannerVisible ? <OfflineBanner /> : null}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Ask your ADTP agent anything</Text>
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
          <FlashList
            ref={listRef}
            data={messages}
            maintainVisibleContentPosition={{
              autoscrollToBottomThreshold: 80,
              startRenderingFromBottom: true,
              animateAutoScrollToBottom: true,
            }}
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
          />
        )}

        <View style={styles.inputZone}>
          {agentBusy ? (
            <View style={styles.typingZone}>
              <LoadingBubble toolName={runningTool} />
            </View>
          ) : null}
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
              testID="chat-input"
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
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              <Ionicons name="arrow-up" size={18} color={colours.white} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    backgroundColor: colours.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: colours.purpleDim,
  },
  wordmark: {
    color: colours.gold,
    fontSize: 20,
    fontFamily: 'Audiowide',
    letterSpacing: 3,
  },
  connection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  latency: {
    color: colours.textMuted,
    fontSize: 12,
    fontFamily: 'Offside',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colours.bgOverlay,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colours.goldDim,
  },
  bannerText: {
    flex: 1,
    color: colours.stateWarning,
    fontSize: 12,
    fontFamily: 'Offside',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
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
    color: colours.purpleBright,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
  },
  inputZone: {
    backgroundColor: colours.bgSurface,
    borderTopWidth: 1,
    borderTopColor: colours.purpleDim,
  },
  typingZone: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colours.bgOverlay,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    borderRadius: 22,
    color: colours.textSecondary,
    fontSize: 14,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxHeight: 120,
    minHeight: touchTarget,
    fontFamily: 'Offside',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
