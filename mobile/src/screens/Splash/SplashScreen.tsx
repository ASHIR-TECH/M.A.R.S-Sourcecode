import React, { useEffect } from 'react';
import { ImageBackground, Text, View } from 'react-native';
import * as SplashScreenNative from 'expo-splash-screen';
import { useFonts } from 'expo-font';
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
    'Quantico-Bold': require('../../../assets/fonts/Quantico-Bold.ttf'),
    'Offside-Regular': require('../../../assets/fonts/Offside-Regular.ttf'),
    'Megrim-Regular': require('../../../assets/fonts/Megrim-Regular.ttf'),
    'Montserrat-Regular': require('../../../assets/fonts/Montserrat-Regular.ttf'),
  });

  const fontsReady = fontsLoaded || fontError;

  // The native splash is only a solid backdrop; swap to the branded JS splash
  // as soon as the fonts are in hand so the branding is visible for the rest
  // of the minimum display duration.
  useEffect(() => {
    if (!fontsReady) return;
    markAssetsReady();
    SplashScreenNative.hideAsync().catch(() => {
      // no-op: nothing to reveal if the native splash already hid
    });
  }, [fontsReady, markAssetsReady]);

  useEffect(() => {
    if (isReadyToNavigate) {
      onFinished();
    }
  }, [isReadyToNavigate, onFinished]);

  // Always render — the absolutely-filled background guarantees the splash is
  // never a blank frame, even before fonts or the image have finished loading.
  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../../assets/images/splash-bg-phone.jpg')}
        style={styles.background}
        resizeMode="cover"
      />
      {fontsReady ? (
        <>
          <View style={styles.centerContent}>
            <Text style={styles.title}>MARS</Text>
          </View>
          <Text style={styles.footer}>By ASHIR</Text>
        </>
      ) : null}
    </View>
  );
}
