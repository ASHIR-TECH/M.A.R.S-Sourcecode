import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Animated,
  Easing,
  useWindowDimensions,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { FlashListRef } from '@shopify/flash-list';
import { AppBackground } from '../../components/AppBackground';
import { useChatSessionStore } from '../../store/useChatSessionStore';
import { useRelayConnectionApi } from '../../relay/RelayConnectionContext';
import { ChatBubble } from '../../components/ChatBubble';
import { TypingIndicator } from '../../components/TypingIndicator';
import { ChatMessage } from '../../types/chatMessage';
import { ChatComposer } from './ChatComposer';
import { styles, chatBottomInset } from './ChatScreen.styles';

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

export const ChatScreen = React.memo(function ChatScreen() {
  const messages = useChatSessionStore((s) => s.messages);
  const isAwaitingResponse = useChatSessionStore((s) => s.isAwaitingResponse);
  const { sendChatMessage } = useRelayConnectionApi();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const listRef = useRef<FlashListRef<ChatMessage>>(null);
  const atBottomRef = useRef(true);

  useEffect(() => {
    const showName = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const show = Keyboard.addListener(showName, (e) => {
      setKeyboardOpen(true);
      if (e.endCoordinates.height > 0) {
        requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
      }
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Only auto-follow new content while the user is parked at the bottom; if
  // they scrolled up to read history, an incoming bubble must not yank them.
  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    atBottomRef.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 80;
  }, []);

  const handleContentSizeChange = useCallback(() => {
    if (atBottomRef.current) listRef.current?.scrollToEnd({ animated: true });
  }, []);

  const keyExtractor = useCallback((m: ChatMessage) => m.id, []);
  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => <ChatBubble message={item} />,
    []
  );
  const footer = isAwaitingResponse ? <TypingIndicator /> : null;

  return (
    <AppBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.container, { paddingBottom: chatBottomInset(keyboardOpen) }]}>
        <View style={styles.header}>
          <Text style={styles.title}>CHAT</Text>
          <View style={styles.statusDot} />
          <AnimatedHeaderLine />
        </View>

          <FlashList
            ref={listRef}
            data={messages}
            keyExtractor={keyExtractor}
            renderItem={renderMessage}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onContentSizeChange={handleContentSizeChange}
            ListFooterComponent={footer}
            contentContainerStyle={styles.thread}
            showsVerticalScrollIndicator={false}
          />

        <ChatComposer sendChatMessage={sendChatMessage} />
      </View>
      </KeyboardAvoidingView>
    </AppBackground>
  );
});
