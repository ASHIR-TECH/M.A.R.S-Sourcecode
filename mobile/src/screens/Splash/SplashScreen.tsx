import React, { useEffect, useState } from 'react';
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
  const [imageLoaded, setImageLoaded] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    'Audiowide-Regular': require('../../../assets/fonts/Audiowide-Regular.ttf'),
    'Quantico-Bold': require('../../../assets/fonts/Quantico-Bold.ttf'),
    'Offside-Regular': require('../../../assets/fonts/Offside-Regular.ttf'),
    'Megrim-Regular': require('../../../assets/fonts/Megrim-Regular.ttf'),
    'Montserrat-Regular': require('../../../assets/fonts/Montserrat-Regular.ttf'),
  });

  const assetsReady = (fontsLoaded || fontError) && imageLoaded;

  // The native splash is only a solid backdrop; as soon as our branded
  // background is decoded, swap to the JS splash so the branding is actually
  // visible for the rest of the minimum display duration.
  useEffect(() => {
    if (!assetsReady) return;
    markAssetsReady();
    SplashScreenNative.hideAsync().catch(() => {
      // no-op: nothing to reveal if the native splash already hid
    });
  }, [assetsReady, markAssetsReady]);

  useEffect(() => {
    if (isReadyToNavigate) {
      onFinished();
    }
  }, [isReadyToNavigate, onFinished]);

  // Keep nothing visible until the branded background is ready — the native
  // splash (solid dark) already covers the screen in the meantime.
  if (!assetsReady) {
    return null;
  }

  return (
    <ImageBackground
      source={require('../../../assets/images/splash-bg.jpg')}
      style={styles.container}
      resizeMode="cover"
      onLoadEnd={() => setImageLoaded(true)}
    >
      <View style={styles.centerContent}>
        <Text style={styles.title}>MARS</Text>
      </View>
      <Text style={styles.footer}>By ASHIR</Text>
    </ImageBackground>
  );
}
