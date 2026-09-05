import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, Animated, Easing, useWindowDimensions, Platform, KeyboardAvoidingView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { AppBackground } from '../../components/AppBackground';
import { useChatSessionStore } from '../../store/useChatSessionStore';
import { useRelayConnection } from '../../relay/useRelayConnection';
import { ChatBubble } from '../../components/ChatBubble';
import { AttachmentCard } from '../../components/AttachmentCard';
import { TypingIndicator } from '../../components/TypingIndicator';
import { ChatAttachment } from '../../types/chatMessage';
import { styles } from './ChatScreen.styles';

const SESSION_ID = 'default-session'; // multi-session support deferred

/** A glowing amber light that sweeps left→right along a line, looping forever. */
function AnimatedHeaderLine() {
  const { width } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const lightX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, width],
  });
  const lightOpacity = progress.interpolate({
    inputRange: [0, 0.2, 0.5, 0.8, 1],
    outputRange: [0, 1, 1, 1, 0],
  });

  return (
    <View style={styles.headerLine} pointerEvents="none">
      <Animated.View style={[styles.headerLight, { transform: [{ translateX: lightX }], opacity: lightOpacity }]} />
    </View>
  );
}

// Simulated Co-Pilot replies so the thinking + typewriter flow is visible
// without a live relay echo (replace with real chat_response handling later).
function mockAiReply(prompt: string): string {
  const p = prompt.trim().toLowerCase();
  if (p.includes('status') || p.includes('node') || p.includes('device')) {
    return 'All nodes are online. CPU usage is nominal across DEV-001 through DEV-004. No alerts in the last 24 hours.';
  }
  return `I found some info related to "${prompt.trim()}". Want me to dig deeper into any specific node or metric?`;
}

export function ChatScreen() {
  const { messages, isAwaitingResponse, addUserMessage, markSent, addAiMessage } = useChatSessionStore();
  const { send } = useRelayConnection();
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const listRef = useRef<FlatList>(null);

  const handleSend = () => {
    if (!draft.trim() && !attachment) return;

    // Optimistic append — the user's message renders instantly (sending → sent).
    const text = draft.trim();
    const message = addUserMessage(text, SESSION_ID, attachment ?? undefined);
    const sent = send({ type: 'chat_message', sessionId: SESSION_ID, text: message.text });
    if (sent) markSent(message.id);
    const prompt = draft.trim() || (attachment && attachment.name) || '';
    setDraft('');
    setAttachment(null);

    // Simulated thinking delay, then a typed response (demo fallback).
    setTimeout(() => {
      addAiMessage(SESSION_ID, mockAiReply(prompt), new Date().toISOString());
    }, 700);
  };

  // File attach: pick a document from local storage and surface it as a chip.
  const handleAttach = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        if (asset) {
          setAttachment({ name: asset.name, mimeType: asset.mimeType, size: asset.size ?? undefined, uri: asset.uri });
        }
      }
    } catch {
      // picker dismiss/cancel needs no handling
    }
  };

  return (
    <AppBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : undefined}
      >
        <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>CHAT</Text>
          <View style={styles.statusDot} />
          <AnimatedHeaderLine />
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

        <View style={styles.inputWrap}>
          {attachment && (
            <AttachmentCard attachment={attachment} size="preview" onRemove={() => setAttachment(null)} />
          )}
          <View style={styles.inputBar}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask Co-Pilot about node statuses…"
              placeholderTextColor="#8A7A68"
              style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
              selectionColor="rgba(232,163,77,0.35)"
              onSubmitEditing={handleSend}
              multiline
              blurOnSubmit={false}
            />
            <View style={styles.actions}>
              {draft.trim().length > 0 && (
                <Pressable onPress={handleAttach} style={styles.attachButton} accessibilityLabel="Attach file">
                  <Text style={styles.attachIcon}>{'+'}</Text>
                </Pressable>
              )}
              <Pressable onPress={handleSend} style={styles.sendButton} accessibilityLabel="Send message">
                <Text style={styles.sendIcon}>{'➤'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
      </KeyboardAvoidingView>
    </AppBackground>
  );
}
