import React from 'react';
import { ImageBackground, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { glass } from '../theme/glass';

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
      <BlurView intensity={glass.intensity} tint={glass.tint} style={StyleSheet.absoluteFill} />
      {children}
    </ImageBackground>
  );
}
