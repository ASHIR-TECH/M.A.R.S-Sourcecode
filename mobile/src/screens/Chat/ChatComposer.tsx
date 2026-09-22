import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { useChatSessionStore } from '../../store/useChatSessionStore';
import { AttachmentCard } from '../../components/AttachmentCard';
import { ChatAttachment } from '../../types/chatMessage';
import { styles } from './ChatScreen.styles';

const SESSION_ID = 'default-session'; // multi-session support deferred

interface ChatComposerProps {
  sendChatMessage: (sessionId: string, text: string) => Promise<void>;
}

/**
 * Owns the draft + attachment state so typing re-renders only this input bar,
 * never the message thread above it (the thread can hold hundreds of bubbles,
 * each with a BlurView, so isolating the composer keeps typing smooth).
 */
export function ChatComposer({ sendChatMessage }: ChatComposerProps) {
  const addUserMessage = useChatSessionStore((s) => s.addUserMessage);
  const markSent = useChatSessionStore((s) => s.markSent);
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);

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
  );
}
