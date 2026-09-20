import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

interface ClipboardIconProps {
  size?: number;
  color?: string;
}

/** Copy/clipboard glyph — overlapping sheets. */
export function ClipboardIcon({ size = 16, color = '#F5EFE6' }: ClipboardIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="9"
        y="9"
        width="11"
        height="11"
        rx="2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
