import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, Platform, Image } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useChatSessionStore } from '../../store/useChatSessionStore';
import { AttachmentCard } from '../../components/AttachmentCard';
import { ChatAttachment } from '../../types/chatMessage';
import { styles } from './ChatScreen.styles';

const SESSION_ID = 'default-session'; // multi-session support deferred

/** Idle hint. Rendered by us (see styles.placeholder) so it never wraps. */
const PLACEHOLDER = 'Ask Co-Pilot about node statuses';

/** Focus transition — fast enough to feel instant, slow enough to read as intent. */
const FOCUS_MS = 180;

interface ChatComposerProps {
  sendChatMessage: (sessionId: string, text: string) => Promise<void>;
}

/**
 * Owns the draft + attachment state so typing re-renders only this input bar,
 * never the message thread above it (the thread can hold hundreds of bubbles,
 * each with a BlurView, so isolating the composer keeps typing smooth).
 *
 * Idle it matches every other surface; on focus it grows taller, pulls in from
 * the edges, and clears the hint so only the accent caret is left blinking.
 */
export function ChatComposer({ sendChatMessage }: ChatComposerProps) {
  const addUserMessage = useChatSessionStore((s) => s.addUserMessage);
  const markSent = useChatSessionStore((s) => s.markSent);
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const [focused, setFocused] = useState(false);

  // 0 = idle, 1 = focused; drives the bar's height/width/border on the UI thread.
  const focus = useSharedValue(0);

  const handleFocus = useCallback(() => {
    setFocused(true);
    focus.value = withTiming(1, { duration: FOCUS_MS });
  }, [focus]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    focus.value = withTiming(0, { duration: FOCUS_MS });
  }, [focus]);

  const barStyle = useAnimatedStyle(() => ({
    // More length (taller), less width (inset from both edges).
    paddingVertical: 6 + focus.value * 8,
    marginHorizontal: focus.value * 8,
    borderColor: interpolateColor(
      focus.value,
      [0, 1],
      ['rgba(232, 163, 77, 0.35)', 'rgba(232, 163, 77, 0.9)'],
    ),
  }));

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text && !attachment) return;

    // Optimistic append — the user's message renders instantly (sending → sent).
    const message = addUserMessage(text, SESSION_ID, attachment ?? undefined);
    markSent(message.id);

    // Routing (relay vs. quick-response fallback) is decided inside the hook,
    // never here — PHASE_12 NFR-2.
    void sendChatMessage(SESSION_ID, message.text);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setDraft('');
    setAttachment(null);
  }, [draft, attachment, addUserMessage, markSent, sendChatMessage]);

  // File attach: pick a document from local storage and surface it as a chip.
  const handleAttach = useCallback(async () => {
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
  }, []);

  return (
    <View style={styles.inputWrap}>
      {attachment && (
        <AttachmentCard attachment={attachment} size="preview" onRemove={() => setAttachment(null)} />
      )}
      <Animated.View style={[styles.inputBar, barStyle]}>
        <View style={styles.inputField}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder=""
            style={[styles.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
            // Standard MARS accent — the caret glows the same amber as the chat.
            selectionColor="#E8A34D"
            cursorColor="#E8A34D"
            onFocus={handleFocus}
            onBlur={handleBlur}
            onSubmitEditing={handleSend}
            multiline
            blurOnSubmit={false}
          />
          {!focused && !draft && (
            <Text
              style={styles.placeholder}
              numberOfLines={1}
              ellipsizeMode="tail"
              pointerEvents="none"
            >
              {PLACEHOLDER}
            </Text>
          )}
        </View>
        <View style={styles.actions}>
          {draft.trim().length > 0 && (
            <Pressable onPress={handleAttach} style={styles.attachButton} accessibilityLabel="Attach file">
              <Image
                source={require('../../assets/images/icon-link.png')}
                style={styles.attachIcon}
                resizeMode="contain"
              />
            </Pressable>
          )}
          <Pressable onPress={handleSend} style={styles.sendButton} accessibilityLabel="Send message">
            <Text style={styles.sendIcon}>{'➤'}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}
