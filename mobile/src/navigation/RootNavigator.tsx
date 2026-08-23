import React from 'react';
import { View, Text } from 'react-native';
import { AppBackground } from '../components/AppBackground';
import { MarsLogo } from '../components/icons/MarsLogo';
import { SignInScreen } from '../screens/SignIn/SignInScreen';
import { useAuthStore } from '../store/useAuthStore';
import { typography } from '../theme/typography';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

/**
 * Branches on auth status (Phase 2): unauthenticated users get the Sign In
 * screen; authenticated users land on the Home placeholder. Session
 * restore-on-launch bootstrap belongs to Phase 3+.
 */
export function RootNavigator() {
  const status = useAuthStore((s) => s.status);

  if (status === 'authenticated') {
    return <HomePlaceholder />;
  }

  return <SignInScreen />;
}

function HomePlaceholder() {
  return (
    <AppBackground>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md }}>
        <MarsLogo size={120} />
        <Text style={{ ...typography.splashTitle, color: colors.textPrimary }}>MARS</Text>
      </View>
    </AppBackground>
  );
}
