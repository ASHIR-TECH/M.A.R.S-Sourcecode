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
      <ClipboardIcon size={18} color={copied ? colors.accent : colors.textMuted} />
      {copied && <Text style={styles.copiedLabel}>Copied</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    paddingVertical: 2,
  },
  copiedLabel: { color: colors.accent, fontSize: 10, fontStyle: 'italic' },
});
