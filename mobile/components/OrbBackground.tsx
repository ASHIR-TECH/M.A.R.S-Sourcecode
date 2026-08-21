import React from 'react';
import { ImageBackground, StyleSheet } from 'react-native';

const orbSource = require('../assets/orb-background.jpg');

export function OrbBackground() {
  return (
    <ImageBackground
      source={orbSource}
      style={StyleSheet.absoluteFill}
      resizeMode="cover"
    />
  );
}
