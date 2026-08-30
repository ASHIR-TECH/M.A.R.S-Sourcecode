import { Platform, StyleSheet } from 'react-native';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/colors';

/**
 * Shared tab-bar options (Phase 4, §5.3), adjusted for the M.A.R.S. look:
 * the bar stays transparent and absolutely positioned so AppBackground's orb
 * shows through — the "blur-adjacent" styling NFR-2 asks for.
 */
export const tabBarOptions: BottomTabNavigationOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.accent,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarStyle: StyleSheet.flatten({
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    // NFR-5: reserve room for the iOS home indicator / Android gesture bar
    height: Platform.OS === 'ios' ? 92 : 84,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  }) as any,
  tabBarLabelStyle: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabBarHideOnKeyboard: Platform.OS === 'android',
};