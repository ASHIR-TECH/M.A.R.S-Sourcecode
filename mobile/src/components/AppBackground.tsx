import React from 'react';
import { ImageBackground, StyleProp, ViewStyle } from 'react-native';

interface AppBackgroundProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Use the pre-blurred frosted orb variant (Home + Device Hub). */
  blurred?: boolean;
}

/** Shared full-bleed orb background used across app screens. */
export function AppBackground({ children, style, blurred }: AppBackgroundProps) {
  return (
    <ImageBackground
      source={blurred ? require('../../assets/images/orb-background-frosted.jpg') : require('../../assets/images/orb-background.jpg')}
      style={[{ flex: 1, width: '100%', height: '100%' }, style]}
      resizeMode="cover"
    >
      {children}
    </ImageBackground>
  );
}
