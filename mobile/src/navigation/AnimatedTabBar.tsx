import React, { useCallback, useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { TAB_CONFIG, TabName } from './tabConfig';
import { tabBarMetrics } from './TabNavigator.styles';
import { colors } from '../theme/colors';

/** Increased icon/label visibility — flat bar, aura removed. */
const ICON_COLOR_INACTIVE = 'rgba(232,163,77,0.8)';
const LABEL_COLOR_INACTIVE = 'rgba(255,255,255,0.85)';

/** Android system-nav height: ~48dp for 3-button nav, ~13-24dp for gesture. */
const THREE_BUTTON_NAV_MIN = 32;

interface AnimatedTabBarProps {
  activeIndex: number;
  onSelect: (name: TabName) => void;
  hidden?: boolean;
}

/**
 * Phase 4 custom bottom tab bar: same data-driven TAB_CONFIG as the pager.
 * The bar is divided into 4 equal cells; the active tab is indicated by the
 * full-accent icon and full-white label. The bar rides up with the keyboard
 * (it stays visible while typing, so the chat composer clears it) and slides
 * fully down only when a page asks it to hide (e.g. the Privacy & Security
 * screen).
 */
export function AnimatedTabBar({ activeIndex, onSelect, hidden = false }: AnimatedTabBarProps) {
  const insets = useSafeAreaInsets();
  const contentHidden = useSharedValue(0);
  // Keyboard height from the controller (edge-to-edge aware); the bar lifts by
  // exactly this amount so it keeps sitting just above the keyboard.
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();

  useEffect(() => {
    contentHidden.value = withTiming(hidden ? 1 : 0, { duration: 140 });
  }, [hidden, contentHidden]);

  const hideStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: 300 * contentHidden.value - keyboardHeight.value },
    ],
  }));

  const onTabPress = useCallback(
    (name: TabName) => {
      onSelect(name);
    },
    [onSelect]
  );

  // With 3-button system nav the whole bar lifts above the controls; gesture
  // nav keeps sitting at 0 with the design's built-in bottom padding.
  const bottomPad =
    Platform.OS === 'ios'
      ? tabBarMetrics.paddingBottom
      : Platform.OS === 'android' && insets.bottom >= THREE_BUTTON_NAV_MIN
        ? tabBarMetrics.paddingBottom
        : Math.max(tabBarMetrics.paddingBottom, insets.bottom);
  const barBottom =
    Platform.OS === 'android' && insets.bottom >= THREE_BUTTON_NAV_MIN ? insets.bottom : 0;

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          bottom: barBottom,
          height: tabBarMetrics.height,
          paddingTop: tabBarMetrics.paddingTop,
          paddingBottom: bottomPad,
        },
        hideStyle,
      ]}
    >
      {TAB_CONFIG.map(({ name, label, icon: Icon }, index) => {
        const focused = index === activeIndex;
        return (
          <Pressable
            key={name}
            onPress={() => onTabPress(name)}
            android_disableSound
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            style={styles.tab}
          >
            <Icon color={focused ? colors.accent : ICON_COLOR_INACTIVE} focused={focused} />
            <Text style={[styles.label, { color: focused ? '#FFFFFF' : LABEL_COLOR_INACTIVE }]}>{label}</Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    flexBasis: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    transform: [{ translateY: -5 }], /** lift the icons + labels up a bit */
  },
  label: {
    fontSize: tabBarMetrics.labelFontSize,
    fontFamily: tabBarMetrics.labelFontFamily,
    alignSelf: 'stretch',
    textAlign: 'center',
  },
});
