import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { OrbBackground } from '@/components/OrbBackground';
import { colors } from '@/constants/brand';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Audiowide-Regular': require('../assets/fonts/Audiowide-Regular.ttf'),
    'JetBrainsMono-Variable': require('../assets/fonts/JetBrainsMono-Variable.ttf'),
    'Geist-Variable': require('../assets/fonts/Geist-Variable.ttf'),
    'Quantico-Regular': require('../assets/fonts/Quantico-Regular.ttf'),
    'Quantico-Bold': require('../assets/fonts/Quantico-Bold.ttf'),
    'DMSans-Variable': require('../assets/fonts/DMSans-Variable.ttf'),
    'Offside-Regular': require('../assets/fonts/Offside-Regular.ttf'),
  });

  React.useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <View style={styles.root}>
      <OrbBackground />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="connect" options={{ animation: 'fade' }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
