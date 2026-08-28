import React from 'react';
import { ImageBackground, StyleProp, ViewStyle } from 'react-native';

interface AppBackgroundProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Shared full-bleed orb background used across app screens. */
export function AppBackground({ children, style }: AppBackgroundProps) {
  return (
    <ImageBackground
      source={require('../../assets/images/splash-bg.jpg')}
      style={[{ flex: 1, width: '100%', height: '100%' }, style]}
      resizeMode="cover"
    >
      {children}
    </ImageBackground>
  );
}
