import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Text, TextProps } from 'react-native';

interface TypeWriterTextProps extends TextProps {
  text: string;
  /** Target time (ms) for revealing the whole message. Long text speeds up to stay near it. */
  targetDurationMs?: number;
  /** Lower bound for the gap between reveal ticks (ms). */
  minTickMs?: number;
  /** Upper bound for the gap between reveal ticks (ms). */
  maxTickMs?: number;
  onDone?: () => void;
}

const DEFAULT_TARGET_MS = 1800;
const DEFAULT_MIN_TICK_MS = 14;
const DEFAULT_MAX_TICK_MS = 24;

/** Reveals `text` word by word. Restarts whenever `text` changes. Long messages
 * reveal several words per tick so the total animation time stays bounded. */
export function TypeWriterText({
  text,
  targetDurationMs = DEFAULT_TARGET_MS,
  minTickMs = DEFAULT_MIN_TICK_MS,
  maxTickMs = DEFAULT_MAX_TICK_MS,
  onDone,
  ...rest
}: TypeWriterTextProps) {
  const words = useMemo(() => text.match(/\S+\s*/g) ?? [], [text]);

  const maxTicks = Math.max(1, Math.ceil(targetDurationMs / minTickMs));
  const wordsPerTick = Math.max(1, Math.ceil(words.length / maxTicks));
  const ticks = Math.max(1, Math.ceil(words.length / wordsPerTick));
  const tickMs = Math.min(maxTickMs, Math.max(minTickMs, targetDurationMs / ticks));

  const [revealed, setRevealed] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    setRevealed(0);
    doneRef.current = false;
  }, [text]);

  useEffect(() => {
    if (revealed >= words.length) {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
      return;
    }
    const t = setTimeout(
      () => setRevealed((r) => Math.min(r + wordsPerTick, words.length)),
      tickMs
    );
    return () => clearTimeout(t);
  }, [revealed, words.length, wordsPerTick, tickMs, onDone]);

  const visible = words.slice(0, revealed).join('');

  return (
    <Text {...rest}>
      {visible}
      {revealed < words.length ? '▍' : ''}
    </Text>
  );
}
