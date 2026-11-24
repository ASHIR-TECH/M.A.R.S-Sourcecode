import React, { useEffect, useRef, useState } from 'react';
import { Animated, Linking, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SplashScreen } from './src/screens/Splash/SplashScreen';
import { RootNavigator } from './src/navigation/RootNavigator';
import { usePairingStore } from './src/store/usePairingStore';
import { useDesktopStore } from './src/store/useDesktopStore';
import { disposeAiClient, initAiClient } from './src/relay/aiClient';
import { initTransferNotifications } from './src/notifications/transferNotifications';
import { completeOAuthFromUrl } from './src/auth/oauthSignIn';

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
    initAiClient();
    // Permission prompt + Android channel for incoming media transfers.
    void initTransferNotifications();
    return () => disposeAiClient();
  }, []);

  // Cold-start OAuth: the browser callback can arrive before the Sign In screen
  // is mounted, so no openAuthSessionAsync promise is waiting for it.
  useEffect(() => {
    let alive = true;
    const handleUrl = (url: string) => {
      if (alive) void completeOAuthFromUrl(url).catch(() => {});
    };
    void Linking.getInitialURL().then((url) => url && handleUrl(url)).catch(() => {});
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => {
      alive = false;
      subscription.remove();
    };
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
        <KeyboardProvider>
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
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}