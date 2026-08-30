import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface TabIconProps {
  color: string;
  focused: boolean;
}

/** House outline — Home tab. Stroke-only so active color comes from the tab bar. */
export function HomeTabIcon({ color }: TabIconProps) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9.5L12 3l9 6.5V20a1.5 1.5 0 0 1-1.5 1.5h-5V14h-5v7.5h-5A1.5 1.5 0 0 1 3 20V9.5z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}