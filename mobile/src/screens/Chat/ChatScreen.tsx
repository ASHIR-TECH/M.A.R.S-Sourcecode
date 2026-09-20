import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, Animated, Easing, useWindowDimensions, Platform, KeyboardAvoidingView, Keyboard } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { AppBackground } from '../../components/AppBackground';
import { useChatSessionStore } from '../../store/useChatSessionStore';
import { useRelayConnection } from '../../relay/useRelayConnection';
import { ChatBubble } from '../../components/ChatBubble';
import { AttachmentCard } from '../../components/AttachmentCard';
import { TypingIndicator } from '../../components/TypingIndicator';
import { ChatAttachment } from '../../types/chatMessage';
import { styles } from './ChatScreen.styles';
import { spacing } from '../../theme/spacing';
import { tabBarMetrics } from '../../navigation/TabNavigator.styles';

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

export function ChatScreen() {
  const { messages, isAwaitingResponse, addUserMessage, markSent } = useChatSessionStore();
  const { sendChatMessage } = useRelayConnection();
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const [keyboardH, setKeyboardH] = useState(0);
  const listRef = useRef<FlatList>(null);

  // Standard chat behavior: when the keyboard opens the input bar rides on
  // top of it (container bottom padding shrinks) and the thread scrolls up so
  // the latest bubble stays visible above the input.
  React.useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardH(e.endCoordinates.height);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardH(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const handleSend = () => {
    if (!draft.trim() && !attachment) return;

    // Optimistic append — the user's message renders instantly (sending → sent).
    const text = draft.trim();
    const message = addUserMessage(text, SESSION_ID, attachment ?? undefined);
    markSent(message.id);

    // Routing (relay vs. quick-response fallback) is decided inside the hook,
    // never here — PHASE_12 NFR-2.
    void sendChatMessage(SESSION_ID, message.text);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setDraft('');
    setAttachment(null);
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.container, { paddingBottom: keyboardH > 0 ? spacing.sm : tabBarMetrics.height + 24 }]}>
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
