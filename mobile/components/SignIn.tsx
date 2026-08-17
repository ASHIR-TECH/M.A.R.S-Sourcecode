import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { GoogleIcon, AppleIcon } from '@/components/AuthIcons';
import { brandColours } from '@/constants/brand';

const BUTTON_HEIGHT = 54;
const ENTRANCE_MS = 450;
const STAGGER_MS = 140;
const REVEAL_MS = 1200;
const ICON_SIZE = 22;
const PADDING = 16;
const GAP = 12;
const LABEL_BUFFER = 4;

/**
 * Sign in / Sign up — Google + Apple only. Design mock: buttons are not wired.
 * Each button starts as a bare icon pill; pressing it expands the pill and
 * reveals the full "Sign in with …" label.
 */
export function SignIn() {
  const [maxLabelWidth, setMaxLabelWidth] = useState(0);

  const measure = (label: string) => (e: { nativeEvent: { layout: { width: number } } }) => {
    setMaxLabelWidth((current) => Math.max(current, e.nativeEvent.layout.width));
  };

  return (
    <View style={styles.screen} testID="sign-in-screen">
      <StatusBar style="light" />
      <View style={styles.buttons}>
        <AnimatedButton delay={0}>
          <ExpandableButton
            label="Sign in with Google"
            icon={<GoogleIcon size={ICON_SIZE} />}
            labelWidth={maxLabelWidth}
          />
        </AnimatedButton>
        <AnimatedButton delay={STAGGER_MS}>
          <ExpandableButton
            label="Sign in with Apple"
            icon={<AppleIcon size={ICON_SIZE} />}
            labelWidth={maxLabelWidth}
          />
        </AnimatedButton>
      </View>
      <View
        style={styles.measurer}
        pointerEvents="none"
        onLayout={measure('Sign in with Google')}
      >
        <Text style={styles.buttonText} numberOfLines={1}>
          Sign in with Google
        </Text>
      </View>
      <View
        style={styles.measurer}
        pointerEvents="none"
        onLayout={measure('Sign in with Apple')}
      >
        <Text style={styles.buttonText} numberOfLines={1}>
          Sign in with Apple
        </Text>
      </View>
    </View>
  );
}

function AnimatedButton({ delay, children }: { delay: number; children: React.ReactNode }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: ENTRANCE_MS, easing: Easing.out(Easing.cubic) })
    );
  }, [delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 28 }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

function ExpandableButton({
  icon,
  label,
  labelWidth,
}: {
  icon: React.ReactNode;
  label: string;
  labelWidth: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const labelWidthSV = useSharedValue(0);
  const reveal = useSharedValue(0);

  useEffect(() => {
    if (labelWidth > 0) {
      labelWidthSV.value = labelWidth;
    }
  }, [labelWidth, labelWidthSV]);

  const widthStyle = useAnimatedStyle(() => {
    const expandedWidth = PADDING * 2 + ICON_SIZE + GAP + labelWidthSV.value + LABEL_BUFFER;
    return { width: BUTTON_HEIGHT + (expandedWidth - BUTTON_HEIGHT) * reveal.value };
  });

  const gapStyle = useAnimatedStyle(() => ({ width: GAP * reveal.value }));

  const labelClipStyle = useAnimatedStyle(() => ({
    width: (labelWidthSV.value + LABEL_BUFFER) * reveal.value,
  }));

  const labelFadeStyle = useAnimatedStyle(() => ({ opacity: reveal.value }));

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    reveal.value = withTiming(next ? 1 : 0, {
      duration: REVEAL_MS,
      easing: Easing.out(Easing.cubic),
    });
  };

  return (
    <Animated.View style={[styles.button, widthStyle]}>
      <Pressable
        onPress={toggle}
        accessibilityLabel={label}
        style={({ pressed }) => [styles.pressable, pressed && styles.buttonPressed]}
      >
        {icon}
        <Animated.View style={gapStyle} />
        <Animated.View style={[styles.labelClip, labelClipStyle]}>
          <Animated.Text style={[styles.buttonText, labelFadeStyle]} numberOfLines={1}>
            {label}
          </Animated.Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 32,
  },
  buttons: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  button: {
    height: BUTTON_HEIGHT,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PADDING,
  },
  labelClip: {
    overflow: 'hidden',
  },
  measurer: {
    position: 'absolute',
    left: -10000,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    opacity: 0,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: brandColours.ink,
    fontSize: 17,
    fontWeight: '600',
  },
});
