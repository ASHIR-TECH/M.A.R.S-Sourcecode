import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { GoogleIcon, AppleIcon } from '@/components/AuthIcons';
import { brandColours } from '@/constants/brand';

const BUTTON_HEIGHT = 54;
const ENTRANCE_MS = 450;
const STAGGER_MS = 140;

/**
 * Sign in / Sign up — Google + Apple only. Design mock: buttons are not wired.
 */
export function SignIn() {
  return (
    <View style={styles.screen} testID="sign-in-screen">
      <StatusBar style="dark" />
      <View style={styles.buttons}>
        <AnimatedButton delay={0}>
          <GoogleIcon size={22} />
          <Text style={styles.buttonText}>Sign in with Google</Text>
        </AnimatedButton>
        <AnimatedButton delay={STAGGER_MS}>
          <AppleIcon size={22} />
          <Text style={styles.buttonText}>Sign in with Apple</Text>
        </AnimatedButton>
      </View>
    </View>
  );
}

function AnimatedButton({ delay, children }: { delay: number; children: React.ReactNode }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: ENTRANCE_MS, easing: Easing.out(Easing.cubic) })
    );
  }, [delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 28 }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: brandColours.cream,
    paddingHorizontal: 32,
  },
  buttons: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    height: BUTTON_HEIGHT,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: brandColours.ink,
    fontSize: 17,
    fontWeight: '600',
  },
});
