import React from 'react';
import { Image, ImageBackground, Platform, StyleSheet, View } from 'react-native';

const orbSource = require('../assets/orb-background.jpg');

/**
 * Full-screen orb backdrop.
 * On native: static image. On web: ImageBackground with fallback color.
 */
export function OrbBackground() {
  if (Platform.OS === 'web') {
    return (
      <ImageBackground
        source={orbSource}
        style={StyleSheet.absoluteFill}
        imageStyle={styles.image}
        resizeMode="cover"
      >
        <View style={styles.fallback} />
      </ImageBackground>
    );
  }

  return (
    <Image
      source={orbSource}
      style={StyleSheet.absoluteFill}
      resizeMode="cover"
      testID="orb-background"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
