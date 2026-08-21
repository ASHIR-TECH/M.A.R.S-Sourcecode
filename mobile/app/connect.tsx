import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { GoogleIcon, AppleIcon } from '@/components/AuthIcons';
import { BrandLogo } from '@/components/BrandLogo';
import { colors, FONTS } from '@/constants/brand';

export default function ConnectScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <BrandLogo width={80} color={colors.text} />
          <View style={styles.titleGroup}>
            <Text style={styles.title}>
              SIGN <Text style={styles.titleAccent}>IN</Text>
            </Text>
            <Text style={styles.subtitle}>
              Choose your preferred method to access the station
            </Text>
          </View>
        </View>

        <View style={styles.buttons}>
          <AnimatedButton delay={0}>
            <Pressable
              onPress={() => {}}
              style={({ pressed }) => [styles.authButton, pressed && styles.buttonPressed]}
            >
              <GoogleIcon size={22} />
              <Text style={styles.authLabel}>Continue with Google</Text>
            </Pressable>
          </AnimatedButton>

          <AnimatedButton delay={120}>
            <Pressable
              onPress={() => {}}
              style={({ pressed }) => [styles.authButton, pressed && styles.buttonPressed]}
            >
              <AppleIcon size={20} />
              <Text style={styles.authLabel}>Continue with Apple</Text>
            </Pressable>
          </AnimatedButton>
        </View>

        <Text style={styles.terms}>
          By continuing, you agree to our{' '}
          <Text style={styles.termsLink}>Terms</Text> &{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </KeyboardAvoidingView>
    </View>
  );
}

function AnimatedButton({ delay, children }: { delay: number; children: React.ReactNode }) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 24 }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flex: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 92,
    paddingBottom: 37,
  },
  header: {
    alignItems: 'center',
    gap: 24,
  },
  titleGroup: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: FONTS.audiowide,
    fontSize: 28,
    color: colors.text,
  },
  titleAccent: {
    color: colors.accent,
  },
  subtitle: {
    fontFamily: FONTS.geist,
    fontSize: 14,
    color: colors.text,
    opacity: 0.55,
    textAlign: 'center',
    lineHeight: 18.2,
  },
  buttons: {
    paddingHorizontal: 24,
    gap: 14,
  },
  authButton: {
    height: 56,
    borderRadius: 50,
    backgroundColor: 'rgba(240, 237, 228, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(240, 237, 228, 0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  authLabel: {
    fontFamily: FONTS.quanticoBold,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  terms: {
    fontFamily: FONTS.geist,
    fontSize: 12,
    color: colors.text,
    opacity: 0.45,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 15.6,
  },
  termsLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
