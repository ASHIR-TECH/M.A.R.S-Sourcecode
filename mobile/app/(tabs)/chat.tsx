import React, { useState } from 'react';
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
import { colors, FONTS } from '@/constants/brand';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  time: string;
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  const send = () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.headerDot} />
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>AI AGENT</Text>
          <Text style={styles.headerSub}>Nova Core v2.1</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Start a conversation</Text>
            <Text style={styles.emptyHint}>Type a command or question below</Text>
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
                  item.sender === 'user' ? styles.bubbleUser : styles.bubbleAgent,
                ]}
              >
                <Text style={styles.bubbleText}>{item.text}</Text>
                <Text style={styles.bubbleTime}>{item.time}</Text>
              </View>
            )}
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="### Type a command..."
            placeholderTextColor={colors.text + '50'}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.sendBtn} onPress={send}>
            <Text style={styles.sendText}>GO</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 44,
    paddingBottom: 16,
    gap: 12,
  },
  headerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  headerTextWrap: {
    gap: 2,
  },
  headerTitle: {
    fontFamily: FONTS.quanticoBold,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  headerSub: {
    fontFamily: FONTS.jetbrains,
    fontSize: 10,
    color: colors.text,
    opacity: 0.5,
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
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 10,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: colors.avatarBg,
    borderBottomRightRadius: 4,
  },
  bubbleAgent: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
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
  inputBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  textInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    fontFamily: FONTS.quanticoBold,
    fontSize: 14,
    color: colors.text,
  },
  sendBtn: {
    width: 56,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: {
    fontFamily: FONTS.jetbrains,
    fontSize: 12,
    fontWeight: '700',
    color: colors.bg,
  },
});
