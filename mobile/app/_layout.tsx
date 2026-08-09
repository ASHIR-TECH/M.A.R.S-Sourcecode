import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SplashScreen } from '@/components/SplashScreen';
import { fontAssets } from '@/constants/fonts';
import { colours, radii, spacing } from '@/constants/colours';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AgentProvider } from '@/contexts/AgentContext';
import { PeerProvider } from '@/contexts/PeerContext';
import { useBiometric } from '@/hooks/useBiometric';

const SPLASH_FADE_MS = 300;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fontsReady = fontsLoaded || Boolean(fontError);

  if (!fontsReady) {
    // Keep the native splash visible while fonts load.
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AgentProvider>
          <PeerProvider>
            <StatusBar style="light" />
            <BiometricGate>
              <SplashGate>
                <RootNavigator />
              </SplashGate>
            </BiometricGate>
          </PeerProvider>
        </AgentProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colours.bgDeep },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="transfer/[id]" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

/**
 * Shows the animated splash while startup work completes (font loading is
 * handled before this mounts; auth restore + a minimum visible duration are
 * awaited here), then fades the whole screen out into the app.
 */
function SplashGate({ children }: { children: React.ReactNode }) {
  const { initialized } = useAuth();
  const [animationDone, setAnimationDone] = useState(false);
  const [gone, setGone] = useState(false);
  const opacity = useSharedValue(1);

  const animateOut = useCallback(() => {
    opacity.value = withTiming(
      0,
      { duration: SPLASH_FADE_MS, easing: Easing.in(Easing.ease) },
      (finished) => {
        if (finished) setGone(true);
      }
    );
  }, [opacity]);

  useEffect(() => {
    if (animationDone && initialized) {
      animateOut();
    }
  }, [animationDone, initialized, animateOut]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (gone) {
    return <>{children}</>;
  }

  return (
    <Animated.View style={[styles.flex, animatedStyle]}>
      <SplashScreen onReady={() => setAnimationDone(true)} />
    </Animated.View>
  );
}

/**
 * Locks all app content behind biometric authentication when the user opted in.
 * Content is not rendered until the user authenticates.
 */
function BiometricGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, biometricEnabled } = useAuth();
  const { isAvailable, authenticate, checking } = useBiometric();
  const [unlocked, setUnlocked] = useState(false);

  const locked = isAuthenticated && biometricEnabled && isAvailable && !unlocked;

  if (!locked) {
    return <>{children}</>;
  }

  return (
    <SafeAreaView style={styles.lock}>
      <Ionicons name="lock-closed" size={48} color={colours.gold} />
      <Text style={styles.lockTitle}>Locked</Text>
      <Text style={styles.lockHint}>
        Use Face ID, Touch ID or your passcode to open MARS.
      </Text>
      <Pressable
        onPress={async () => {
          const ok = await authenticate();
          if (ok) setUnlocked(true);
        }}
        disabled={checking}
        style={({ pressed }) => [
          styles.unlockButton,
          pressed && { opacity: 0.8 },
        ]}
      >
        <Ionicons name="finger-print" size={20} color={colours.bgDeep} />
        <Text style={styles.unlockText}>{checking ? 'Checking…' : 'Unlock'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  lock: {
    flex: 1,
    backgroundColor: colours.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  lockTitle: {
    color: colours.textPrimary,
    fontSize: 24,
    fontFamily: 'Audiowide',
  },
  lockHint: {
    color: colours.textSecondary,
    fontSize: 14,
    fontFamily: 'Offside',
    textAlign: 'center',
  },
  unlockButton: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colours.gold,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radii.pill,
  },
  unlockText: {
    color: colours.textOnGold,
    fontSize: 15,
    fontWeight: '600',
  },
});
