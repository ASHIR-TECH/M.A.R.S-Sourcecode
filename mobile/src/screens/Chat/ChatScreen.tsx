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
import { styles } from './ChatScreen.styles';
import { spacing } from '../../theme/spacing';
import { tabBarMetrics } from '../../navigation/TabNavigator.styles';

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
  const messages = useChatSessionStore((s) => s.messages);
  const isAwaitingResponse = useChatSessionStore((s) => s.isAwaitingResponse);
  const { sendChatMessage } = useRelayConnectionApi();
  const [keyboardH, setKeyboardH] = useState(0);
  const listRef = useRef<FlashListRef<ChatMessage>>(null);
  const atBottomRef = useRef(true);

  // Standard chat behavior: when the keyboard opens the input bar rides on
  // top of it (container bottom padding shrinks) and the thread scrolls up so
  // the latest bubble stays visible above the input.
  useEffect(() => {
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.container, { paddingBottom: keyboardH > 0 ? spacing.sm : tabBarMetrics.height + 24 }]}>
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
        />

        <ChatComposer sendChatMessage={sendChatMessage} />
      </View>
      </KeyboardAvoidingView>
    </AppBackground>
  );
}
