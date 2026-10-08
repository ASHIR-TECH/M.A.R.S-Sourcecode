import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { colors } from '../theme/colors';

interface CopyMessageButtonProps {
  text: string;
}

/** Small copy affordance under an AI reply so it can be pasted into other apps. */
export function CopyMessageButton({ text }: CopyMessageButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onPress = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard is best-effort; never block the chat on it.
    }
  }, [text]);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={copied ? 'Reply copied' : 'Copy reply'}
      testID="copy-message-button"
      style={styles.button}
    >
      <ClipboardIcon size={16} color={copied ? '#E8A34D' : '#FFFFFF'} />
      {copied && <Text style={styles.copiedLabel}>Copied</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(232, 163, 77, 0.16)',
  },
  copiedLabel: { color: '#E8A34D', fontSize: 10, fontWeight: '700' },
});
