import React, { useState, useEffect, useRef } from 'react';
import { Text, TextProps } from 'react-native';

interface TypeWriterTextProps extends TextProps {
  text: string;
  /** ms per character typed (fast by default) */
  speed?: number;
  onDone?: () => void;
}

/** Reveals `text` one character at a time. Restarts whenever `text` changes. */
export function TypeWriterText({ text, speed = 12, onDone, ...rest }: TypeWriterTextProps) {
  const [count, setCount] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    setCount(0);
    doneRef.current = false;
  }, [text]);

  useEffect(() => {
    if (count >= text.length) {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
      return;
    }
    const t = setTimeout(() => setCount((c) => c + 1), speed);
    return () => clearTimeout(t);
  }, [count, text, speed, onDone]);

  return (
    <Text {...rest}>
      {text.slice(0, count)}
      {count < text.length ? '▍' : ''}
    </Text>
  );
}
