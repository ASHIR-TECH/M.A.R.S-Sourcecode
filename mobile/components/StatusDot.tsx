import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colours } from '@/constants/colours';

export type StatusDotStatus = 'connected' | 'offline' | 'processing';

interface StatusDotProps {
  status: StatusDotStatus;
  /** Diameter in points (spec: 10px). */
  size?: number;
}

const PULSE_MS = 2000;

/**
 * Animated presence dot — green pulse when connected, grey static when
 * offline, amber pulse while the agent/peer is processing a task.
 */
export function StatusDot({ status, size = 10 }: StatusDotProps) {
  const opacity = useSharedValue(1);

  const color =
    status === 'connected'
      ? colours.stateSuccess
      : status === 'processing'
        ? colours.stateWarning
        : colours.textMuted;

  useEffect(() => {
    if (status === 'offline') {
      cancelAnimation(opacity);
      opacity.value = 1;
      return;
    }
    opacity.value = 1;
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: PULSE_MS / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: PULSE_MS / 2, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
    return () => cancelAnimation(opacity);
  }, [status, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      testID={`status-dot-${status}`}
      style={[
        styles.dot,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    borderWidth: 1,
    borderColor: colours.bgDeep,
  },
});
