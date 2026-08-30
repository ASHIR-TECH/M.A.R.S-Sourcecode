import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { TAB_CONFIG } from './tabConfig';
import { tabBarMetrics } from './TabNavigator.styles';
import { colors } from '../theme/colors';

const AURA = { width: 68, height: 56, top: -3, radius: 16 };
const AURA_CORE = { width: 46, height: 38, radius: 12 };
const AURA_OFFSET_X = -1;
const ICON_COLOR_INACTIVE = 'rgba(232,163,77,0.45)';
const LABEL_COLOR_INACTIVE = 'rgba(255,255,255,0.5)';
const TAB_COUNT = TAB_CONFIG.length;

/**
 * Phase 4 custom bottom tab bar: same data-driven TAB_CONFIG as the default
 * bar, plus a compact amber "box" that glides horizontally behind the active
 * tab's icon. First mount snaps to the initial tab; later switches glide.
 */
export function AnimatedTabBar({ state, navigation, insets }: BottomTabBarProps) {
  const [barWidth, setBarWidth] = useState(0);
  const hasAnimated = useRef(false);

  const boxLeft = useSharedValue(0);
  const keyboardHidden = useSharedValue(0);

  useEffect(() => {
    if (!barWidth) return;
    // Tabs are equal-width flex children, so the center of tab i is exact.
    const target = (barWidth / TAB_COUNT) * (state.index + 0.5) - AURA.width / 2 + AURA_OFFSET_X;
    if (!hasAnimated.current) {
      boxLeft.value = target;
      hasAnimated.current = true;
    } else {
      boxLeft.value = withTiming(target, { duration: 260, easing: Easing.inOut(Easing.ease) });
    }
  }, [state.index, barWidth, boxLeft]);

  // Preserve the old Android tabBarHideOnKeyboard behavior for the custom bar
  useEffect(() => {
    if (Platform.OS !== 'android') return;
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

  const boxStyle = useAnimatedStyle(() => ({ left: boxLeft.value }));
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
    <View
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      style={[
        styles.bar,
        { height: tabBarMetrics.height, paddingTop: tabBarMetrics.paddingTop, paddingBottom: bottomPad },
      ]}
    >
      <Animated.View pointerEvents="none" style={[styles.auraShell, hideStyle, boxStyle]}>
        <Svg width={AURA.width} height={AURA.height}>
          <Defs>
            <RadialGradient id="tabAura" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#E8A34D" stopOpacity={0.38} />
              <Stop offset="0.55" stopColor="#E8A34D" stopOpacity={0.18} />
              <Stop offset="1" stopColor="#E8A34D" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={AURA.width} height={AURA.height} rx={AURA.radius} fill="url(#tabAura)" />
        </Svg>
        <BlurView intensity={26} tint="dark" style={styles.auraCore} />
      </Animated.View>
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
    </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: tabBarMetrics.labelFontSize,
    fontFamily: tabBarMetrics.labelFontFamily,
  },
  auraShell: {
    position: 'absolute',
    top: AURA.top,
    width: AURA.width,
    height: AURA.height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraCore: {
    position: 'absolute',
    left: (AURA.width - AURA_CORE.width) / 2,
    top: (AURA.height - AURA_CORE.height) / 2,
    width: AURA_CORE.width,
    height: AURA_CORE.height,
    borderRadius: AURA_CORE.radius,
    backgroundColor: 'rgba(232,163,77,0.18)',
    overflow: 'hidden',
  },
});