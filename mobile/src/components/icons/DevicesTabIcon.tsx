import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface TabIconProps {
  color: string;
  focused: boolean;
}

/** Monitor — Devices tab. Mirrors the device-hub concept on Phase 3's grid. */
export function DevicesTabIcon({ color }: TabIconProps) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 4h20v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9 21h6" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M12 18v3" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}