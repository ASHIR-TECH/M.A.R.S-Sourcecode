import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { OrbBackground } from '@/components/OrbBackground';

export default function RootLayout() {
  return (
    <View style={styles.root}>
      <OrbBackground />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d0400',
  },
});
