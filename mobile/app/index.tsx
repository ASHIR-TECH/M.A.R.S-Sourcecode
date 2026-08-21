import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { BrandLogo } from '@/components/BrandLogo';
import { colors, FONTS } from '@/constants/brand';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace({ pathname: '/connect' } as any);
    }, 2400);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.center}>
        <BrandLogo width={140} color={colors.text} />
        <Text style={styles.title}>MARS</Text>
      </View>
      <Text style={styles.by}>By ASHIR</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
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
