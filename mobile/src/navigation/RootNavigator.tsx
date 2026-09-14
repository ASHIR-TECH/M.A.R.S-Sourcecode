import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { SignInScreen } from '../screens/SignIn/SignInScreen';
import { TabNavigator } from './TabNavigator';
import { useAuthStore } from '../store/useAuthStore';
import { colors } from '../theme/colors';

// Transparent scene background so AppBackground's orb shows through
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
  },
};

/**
 * Branches on auth status (Phase 2): unauthenticated users get the Sign In
 * screen; authenticated users land on the app. The persisted session (SecureStore)
 * is restored on mount so a reload/app restart does not force a fresh sign-in.
 */
export function RootNavigator() {
  const status = useAuthStore((s) => s.status);
  const restoreSession = useAuthStore((s) => s.restoreSession);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  if (status === 'restoring') {
    return (
      <View style={styles.restoring}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (status === 'authenticated') {
    return (
      <NavigationContainer theme={navigationTheme}>
        <TabNavigator />
      </NavigationContainer>
    );
  }

  return <SignInScreen />;
}

const styles = StyleSheet.create({
  restoring: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});