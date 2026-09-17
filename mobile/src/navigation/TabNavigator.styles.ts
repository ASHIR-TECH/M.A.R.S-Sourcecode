import { Platform } from 'react-native';

/**
 * Shared tab-bar geometry (Phase 4, §5.3). The visual bar lives in
 * AnimatedTabBar; this file keeps the geometry as design tokens so the bar and
 * the pager stay in sync.
 */
export const tabBarMetrics = {
  // NFR-5: reserve room for the iOS home indicator / Android gesture bar
  height: Platform.OS === 'ios' ? 92 : 84,
  paddingTop: 8,
  paddingBottom: Platform.OS === 'ios' ? 32 : 20,
  labelFontSize: 15,
  labelFontFamily: 'Offside-Regular',
} as const;
