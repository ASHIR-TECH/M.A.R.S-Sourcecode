import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GoogleIcon, AppleIcon } from '@/components/AuthIcons';
import { brandColours } from '@/constants/brand';

const BUTTON_HEIGHT = 54;

/**
 * Sign in / Sign up — Google + Apple only. Design mock: buttons are not wired.
 */
export default function SignInScreen() {
  return (
    <View style={styles.screen} testID="sign-in-screen">
      <StatusBar style="dark" />
      <View style={styles.buttons}>
        <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
          <GoogleIcon size={22} />
          <Text style={styles.buttonText}>Sign in with Google</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
          <AppleIcon size={22} />
          <Text style={styles.buttonText}>Sign in with Apple</Text>
        </Pressable>
      </View>
    </View>
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
