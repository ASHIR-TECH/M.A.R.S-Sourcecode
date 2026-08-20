import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { BrandLogo } from '@/components/BrandLogo';
import { colors, FONTS } from '@/constants/brand';

const SPLASH_DURATION_MS = 2400;

export default function IndexScreen() {
  const router = useRouter();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDone(true);
      router.replace({ pathname: '/(tabs)' } as any);
    }, SPLASH_DURATION_MS);
    return () => clearTimeout(t);
  }, [router]);

  if (done) return null;

  return <SplashView />;
}

function SplashView() {
  const logoScale = useSharedValue(0.6);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const byOpacity = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }));
    logoScale.value = withDelay(200, withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }));
    titleOpacity.value = withDelay(700, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    byOpacity.value = withDelay(1200, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, [logoScale, logoOpacity, titleOpacity, byOpacity]);

  const logoAnim = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const titleAnim = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
  }));

  const byAnim = useAnimatedStyle(() => ({
    opacity: byOpacity.value * 0.4,
  }));

  return (
    <View style={styles.screen} testID="splash-screen">
      <StatusBar style="light" />
      <View style={styles.center}>
        <Animated.View style={[styles.logoWrap, logoAnim]}>
          <BrandLogo width={140} color={colors.text} />
        </Animated.View>
        <Animated.Text style={[styles.title, titleAnim]}>MARS</Animated.Text>
      </View>
      <Animated.Text style={[styles.by, byAnim]}>By ASHIR</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 73,
    paddingBottom: 44,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  logoWrap: {
    width: 140,
    height: 87,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FONTS.audiowide,
    fontSize: 40,
    color: colors.text,
    letterSpacing: 2,
  },
  by: {
    fontFamily: FONTS.offside,
    fontSize: 14,
    color: colors.text,
  },
});
