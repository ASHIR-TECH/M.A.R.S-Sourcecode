import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SplashScreen } from './src/screens/Splash/SplashScreen';
import { RootNavigator } from './src/navigation/RootNavigator';
import { usePairingStore } from './src/store/usePairingStore';
import { useDesktopStore } from './src/store/useDesktopStore';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // Restore the paired desktop and the Phase 14 agent connection on launch,
  // so a QR-paired device controls peers without re-scanning.
  useEffect(() => {
    void usePairingStore.getState().restorePairing();
    void useDesktopStore.getState().hydrate();
  }, []);

  const handleSplashFinished = () => {
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
    Animated.timing(splashOpacity, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setShowSplash(false);
      }
    });
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <View style={styles.root}>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: contentOpacity }]}>
            <RootNavigator />
          </Animated.View>
          {showSplash ? (
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: splashOpacity }]}>
              <SplashScreen onFinished={handleSplashFinished} />
            </Animated.View>
          ) : null}
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}