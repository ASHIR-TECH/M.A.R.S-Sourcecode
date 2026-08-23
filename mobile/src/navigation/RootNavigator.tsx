import React from 'react';
import { View, Text } from 'react-native';
import { AppBackground } from '../components/AppBackground';
import { MarsLogo } from '../components/icons/MarsLogo';
import { typography } from '../theme/typography';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

/**
 * Placeholder root container shown between splash completion and Phase 2.
 * Mirrors the splash lockup so hand-off is seamless; the Sign In
 * (auth stack) mounts here in Phase 2, later phases add session branching.
 */
export function RootNavigator() {
  return (
    <AppBackground>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md }}>
        <MarsLogo size={120} />
        <Text style={{ ...typography.splashTitle, color: colors.textPrimary }}>MARS</Text>
      </View>
    </AppBackground>
  );
}
