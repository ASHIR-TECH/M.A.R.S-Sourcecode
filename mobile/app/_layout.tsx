import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { fontAssets } from '@/constants/fonts';
import { colours, radii, spacing } from '@/constants/colours';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AgentProvider } from '@/contexts/AgentContext';
import { TransferProvider } from '@/contexts/TransferContext';
import { useBiometric } from '@/hooks/useBiometric';

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
          <TransferProvider>
            <StatusBar style="light" />
            <BiometricGate>
              <RootNavigator />
            </BiometricGate>
          </TransferProvider>
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
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="setup" />
      <Stack.Screen name="transfer/[id]" options={{ presentation: 'modal' }} />
    </Stack>
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

  const locked =
    isAuthenticated && biometricEnabled && isAvailable && !unlocked;

  if (!locked) {
    return <>{children}</>;
  }

  return (
    <SafeAreaView style={styles.lock}>
      <Ionicons name="lock-closed" size={48} color={colours.gold} />
      <Text style={styles.lockTitle}>Locked</Text>
      <Text style={styles.lockHint}>
        Use Face ID, Touch ID or your device passcode to open ADTP.
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
