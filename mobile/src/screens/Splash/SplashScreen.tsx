import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import * as SplashScreenNative from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { AppBackground } from '../../components/AppBackground';
import { MarsLogo } from '../../components/icons/MarsLogo';
import { useSplashTimer } from './useSplashTimer';
import { styles } from './SplashScreen.styles';

// Prevent the native splash from auto-hiding until we explicitly say so.
SplashScreenNative.preventAutoHideAsync().catch(() => {
  // no-op: safe to ignore if already prevented
});

interface SplashScreenProps {
  /** Called once splash has fully completed and it's safe to navigate away */
  onFinished: () => void;
}

export function SplashScreen({ onFinished }: SplashScreenProps) {
  const { isReadyToNavigate, markAssetsReady } = useSplashTimer();

  const [fontsLoaded, fontError] = useFonts({
    'Audiowide-Regular': require('../../../assets/fonts/Audiowide-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      markAssetsReady();
    }
  }, [fontsLoaded, fontError, markAssetsReady]);

  useEffect(() => {
    if (isReadyToNavigate) {
      SplashScreenNative.hideAsync().finally(onFinished);
    }
  }, [isReadyToNavigate, onFinished]);

  // Keep native splash visible until fonts are loaded — render nothing
  // rather than an unstyled fallback.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AppBackground>
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <MarsLogo size={120} />
          <Text style={styles.title}>MARS</Text>
        </View>
        <Text style={styles.footer}>By ASHIR</Text>
      </View>
    </AppBackground>
  );
}
