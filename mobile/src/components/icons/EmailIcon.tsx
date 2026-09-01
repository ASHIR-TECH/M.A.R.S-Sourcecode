import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

interface BrandIconProps {
  size?: number;
}

export function EmailIcon({ size = 20 }: BrandIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="2"
        y="4"
        width="20"
        height="16"
        rx="3"
        stroke="#E8A34D"
        strokeWidth="2"
      />
      <Path d="M3 6l9 7 9-7" stroke="#E8A34D" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
