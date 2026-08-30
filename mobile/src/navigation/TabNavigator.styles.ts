import { Platform, StyleSheet } from 'react-native';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

/**
 * Shared tab-bar options (Phase 4, §5.3). The visual bar (transparent,
 * elevated, animated indicator) lives in AnimatedTabBar; this file keeps the
 * geometry as design tokens so both stay in sync.
 */
export const tabBarOptions: BottomTabNavigationOptions = {
  headerShown: false,
};

export const tabBarMetrics = {
  // NFR-5: reserve room for the iOS home indicator / Android gesture bar
  height: Platform.OS === 'ios' ? 92 : 84,
  paddingTop: 8,
  paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  labelFontSize: 13,
  labelFontFamily: 'Offside-Regular',
} as const;