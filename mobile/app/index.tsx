import React, { useEffect, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SignIn } from '@/components/SignIn';
import { brandColours } from '@/constants/brand';

const SPLASH_DURATION_MS = 2200;

/**
 * App entry: shows the splash PNG, then swaps to the login page in place —
 * so a reload always starts at the splash.
 */
export default function IndexScreen() {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  if (splashDone) {
    return <SignIn />;
  }

  return (
    <LinearGradient
      colors={brandColours.cream}
      style={styles.screen}
      testID="splash-screen"
    >
      <StatusBar style="dark" />
      <Image
        source={require('@/assets/splash.png')}
        style={styles.image}
        resizeMode="contain"
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
