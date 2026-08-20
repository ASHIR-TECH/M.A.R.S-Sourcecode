import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { sendMessage, getAgentStatus, type AgentMessage, type AgentStatus } from '@/api/client';
import { colors, FONTS } from '@/constants/brand';

export default function ChatScreen() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getAgentStatus().then(({ data }) => {
      if (data) setAgentStatus(data);
    });
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);

    const userMsg: AgentMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const { data, error } = await sendMessage(text);
    setSending(false);

    if (data) {
      const agentMsg: AgentMessage = {
        id: data.id,
        role: 'assistant',
        content: data.content,
        timestamp: data.timestamp,
      };
      setMessages((prev) => [...prev, agentMsg]);
    } else if (error) {
      const errMsg: AgentMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    }
  }, [input, sending]);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      {/* Dimmed top area */}
      <View style={styles.dimmedTop}>
        <View style={styles.statusBar}>
          <Text style={styles.statusTime}>9:41</Text>
        </View>
        <View style={styles.topNav}>
          <Text style={styles.navTitle}>AI AGENT</Text>
          <Text style={styles.navSub}>
            {agentStatus?.status?.toUpperCase() || 'OFFLINE'}
          </Text>
        </View>
      </View>

      {/* Chat panel */}
      <KeyboardAvoidingView
        style={styles.panel}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.dragHandleRow}>
          <View style={styles.dragHandle} />
        </View>

        <View style={styles.panelHeader}>
          <View style={styles.panelHeaderLeft}>
            <View style={styles.panelDot} />
            <Text style={styles.panelTitle}>COMMAND</Text>
          </View>
          <Text style={styles.panelStatus}>
            {agentStatus ? `${agentStatus.provider} · ${agentStatus.model}` : 'STANDBY'}
          </Text>
        </View>

        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No active commands</Text>
            <Text style={styles.emptyHint}>Send a command to get started</Text>
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.messageList}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.bubble,
                  item.role === 'user' ? styles.bubbleUser : styles.bubbleAgent,
                ]}
              >
                <Text style={styles.bubbleText}>{item.content}</Text>
                <Text style={styles.bubbleTime}>
                  {new Date(item.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            )}
          />
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="### Type a command..."
            placeholderTextColor={colors.text + '50'}
            onSubmitEditing={send}
            returnKeyType="send"
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
            onPress={send}
            disabled={sending}
          >
            <Text style={styles.sendText}>{sending ? '...' : 'GO'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Bottom anchor */}
      <View style={styles.bottomAnchor}>
        <TouchableOpacity style={styles.glassBtn} onPress={() => {}}>
          <Text style={styles.glassBtnText}>+</Text>
        </TouchableOpacity>
        <View style={styles.homeIndicator}>
          <View style={styles.indicatorBar} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  dimmedTop: {
    height: 112,
    opacity: 0.25,
  },
  statusBar: {
    height: 44,
    paddingHorizontal: 24,
    paddingTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusTime: {
    fontFamily: FONTS.jetbrains,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  topNav: {
    height: 68,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navTitle: {
    fontFamily: FONTS.quanticoBold,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  navSub: {
    fontFamily: FONTS.jetbrains,
    fontSize: 10,
    color: colors.accent,
    opacity: 0.7,
  },
  panel: {
    flex: 1,
    backgroundColor: colors.panelBg,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16,
  },
  dragHandleRow: {
    height: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.text,
    opacity: 0.2,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  panelHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  panelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  panelTitle: {
    fontFamily: FONTS.quanticoBold,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 1,
  },
  panelStatus: {
    fontFamily: FONTS.jetbrains,
    fontSize: 10,
    color: colors.accent,
    opacity: 0.7,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontFamily: FONTS.geist,
    fontSize: 14,
    color: colors.text,
    opacity: 0.35,
  },
  emptyHint: {
    fontFamily: FONTS.geist,
    fontSize: 12,
    color: colors.text,
    opacity: 0.25,
  },
  messageList: {
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: colors.card,
    borderBottomRightRadius: 4,
  },
  bubbleAgent: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontFamily: FONTS.geist,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  bubbleTime: {
    fontFamily: FONTS.jetbrains,
    fontSize: 9,
    color: colors.text,
    opacity: 0.4,
    alignSelf: 'flex-end',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    fontFamily: FONTS.geist,
    fontSize: 14,
    color: colors.text,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendText: {
    fontFamily: FONTS.jetbrains,
    fontSize: 12,
    fontWeight: '700',
    color: colors.bg,
  },
  bottomAnchor: {
    alignItems: 'center',
  },
  glassBtn: {
    width: 160,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.panelBg,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  glassBtnText: {
    fontFamily: FONTS.jetbrains,
    fontSize: 24,
    fontWeight: '700',
    color: colors.accent,
  },
  homeIndicator: {
    height: 25,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  indicatorBar: {
    width: 139,
    height: 5,
    borderRadius: 100,
    backgroundColor: colors.text,
    opacity: 0.2,
  },
});
