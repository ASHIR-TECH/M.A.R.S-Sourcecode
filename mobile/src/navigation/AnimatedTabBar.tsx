import React, { useCallback, useEffect } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { TAB_CONFIG } from './tabConfig';
import { tabBarMetrics } from './TabNavigator.styles';
import { colors } from '../theme/colors';

/** Increased icon/label visibility — flat bar, aura removed. */
const ICON_COLOR_INACTIVE = 'rgba(232,163,77,0.8)';
const LABEL_COLOR_INACTIVE = 'rgba(255,255,255,0.85)';

/**
 * Phase 4 custom bottom tab bar: same data-driven TAB_CONFIG as the default
 * bar. The bar is divided into 4 equal cells; the active tab is indicated by
 * the full-accent icon and full-white label. The bar slides down when the
 * keyboard opens so the chat screen can use the full bottom half.
 */
export function AnimatedTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const keyboardHidden = useSharedValue(0);

  // Hide the bar when the keyboard opens so the chat screen can use the full
  // bottom half (old Android tabBarHideOnKeyboard behavior, extended to iOS).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = Keyboard.addListener('keyboardDidShow', () => {
      keyboardHidden.value = withTiming(1, { duration: 180 });
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardHidden.value = withTiming(0, { duration: 180 });
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [keyboardHidden]);

  const hideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: 300 * keyboardHidden.value }],
  }));

  const onTabPress = useCallback(
    (name: 'Home' | 'Chat' | 'Devices' | 'Settings') => {
      navigation.navigate(name);
    },
    [navigation]
  );

  const bottomPad = Platform.OS === 'ios' ? tabBarMetrics.paddingBottom : Math.max(tabBarMetrics.paddingBottom, insets.bottom);

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          height: tabBarMetrics.height,
          paddingTop: tabBarMetrics.paddingTop,
          paddingBottom: bottomPad,
        },
        hideStyle,
      ]}
    >
      {TAB_CONFIG.map(({ name, label, icon: Icon }, index) => {
        const focused = index === state.index;
        return (
          <Pressable
            key={name}
            onPress={() => onTabPress(name)}
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
  },
});