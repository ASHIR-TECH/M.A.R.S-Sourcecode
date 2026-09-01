import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

interface BrandIconProps {
  size?: number;
}

export function MysteryBoxIcon({ size = 20 }: BrandIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9.5 12 4l9 5.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"
        stroke="#E8A34D"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <Path
        d="M3 9.5h18"
        stroke="#E8A34D"
        strokeWidth="2"
      />
      {/* question mark */}
      <Path
        d="M12 17.5c0-2.2 1.8-2.6 1.8-3.8a1.8 1.8 0 0 0-3.6 0"
        stroke="#E8A34D"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <Rect x="11.3" y="18.4" width="1.4" height="1.4" rx="0.2" fill="#E8A34D" />
    </Svg>
  );
}
