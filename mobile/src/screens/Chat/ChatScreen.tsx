import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  Easing,
  useWindowDimensions,
  Platform,
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';
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
  const listRef = useRef<FlashListRef<ChatMessage>>(null);
  const atBottomRef = useRef(true);

  // The window is edge-to-edge, so Android's adjustResize leaves the content
  // full-height behind the keyboard. react-native-keyboard-controller reports the
  // live, device-measured keyboard height instead. Its `height` shared value is
  // signed negative (it is pre-signed for `translateY`), so we flip it to get the
  // positive bottom inset. The chat content box then shrinks by exactly that much
  // so the composer lands flush on the top edge of the keyboard. The tab-bar
  // clearance fades out over the same progress (and the bar tucks itself away),
  // so nothing is left stranded in the gap.
  const { height: keyboardHeight, progress } = useReanimatedKeyboardAnimation();
  const containerStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(-keyboardHeight.value, 0) + (1 - progress.value) * chatBottomInset,
  }));

  useEffect(() => {
    const showName = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const show = Keyboard.addListener(showName, (e) => {
      if (e.endCoordinates.height > 0) {
        requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
      }
    });
    return () => show.remove();
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
      <Reanimated.View style={[styles.container, containerStyle]}>
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
      </Reanimated.View>
    </AppBackground>
  );
});
