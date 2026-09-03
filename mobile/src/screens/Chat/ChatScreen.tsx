import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { AppBackground } from '../../components/AppBackground';
import { useChatSessionStore } from '../../store/useChatSessionStore';
import { useRelayConnection } from '../../relay/useRelayConnection';
import { ChatBubble } from '../../components/ChatBubble';
import { TypingIndicator } from '../../components/TypingIndicator';
import { glass } from '../../theme/glass';
import { styles } from './ChatScreen.styles';

const SESSION_ID = 'default-session'; // multi-session support deferred

export function ChatScreen() {
  const { messages, isAwaitingResponse, addUserMessage, markSent } = useChatSessionStore();
  const { send } = useRelayConnection();
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList>(null);

  const handleSend = () => {
    if (!draft.trim()) return;

    // Optimistic append — the user's message renders instantly (sending → sent).
    const message = addUserMessage(draft.trim(), SESSION_ID);
    const sent = send({ type: 'chat_message', sessionId: SESSION_ID, text: message.text });
    if (sent) markSent(message.id);
    setDraft('');
  };

  return (
    <AppBackground>
      <BlurView intensity={glass.intensity} tint={glass.tint} style={StyleSheet.absoluteFill} />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>MARS AI CO-PILOT</Text>
          <Text style={styles.status}>SYSTEM STATUS: OK</Text>
        </View>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <ChatBubble message={item} />}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={isAwaitingResponse ? <TypingIndicator /> : null}
          contentContainerStyle={styles.thread}
        />

        <View style={styles.inputBar}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask Co-Pilot about node statuses…"
            placeholderTextColor="#8A7A68"
            style={styles.input}
            onSubmitEditing={handleSend}
          />
          <Pressable onPress={handleSend} style={styles.sendButton} accessibilityLabel="Send message">
            <Text style={styles.sendIcon}>{'➤'}</Text>
          </Pressable>
        </View>
      </View>
    </AppBackground>
  );
}
