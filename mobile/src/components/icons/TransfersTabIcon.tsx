import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface TabIconProps {
  color: string;
  focused: boolean;
}

/** Arrows in opposing corners — Transfers tab (peer-to-peer file movement). */
export function TransfersTabIcon({ color }: TabIconProps) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7h13m0 0-3-3m3 3-3 3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20 17H7m0 0 3-3m-3 3 3 3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}