import React, { useEffect, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { fonts } from '../theme/typography';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

/** Marquee pacing for the hint: px/sec of scroll, plus a lead-out gap. */
const SCROLL_SPEED = 34;
const TRAIL_GAP = 48;

export function SearchBar({ value, onChangeText, placeholder }: SearchBarProps) {
  const hint = placeholder ?? 'Search…';

  // Measured in layout so the marquee only moves when the text actually overflows.
  const [boxWidth, setBoxWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const translateX = useSharedValue(0);

  const overflow = Math.max(0, textWidth - Math.max(0, boxWidth - spacing.md * 2));

  useEffect(() => {
    if (overflow <= 0) {
      translateX.value = 0;
      return;
    }
    // Scroll all the way to the end, then restart from the first letter.
    translateX.value = withRepeat(
      withTiming(-(overflow + TRAIL_GAP), {
        duration: ((overflow + TRAIL_GAP) / SCROLL_SPEED) * 1000,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [overflow, translateX]);

  const hintStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={styles.container}
      onLayout={(e) => setBoxWidth(e.nativeEvent.layout.width)}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder=""
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        accessibilityLabel="Search active systems or peers" /**this is the wordings for the search for active systems and history */
        accessibilityRole="search"
      />
      {value === '' && (
        // Unconstrained (left only) so it measures at its natural width, while
        // the parent clips whatever runs past the right edge.
        <View style={styles.hintLayer} pointerEvents="none">
          <Animated.Text
            style={[styles.hint, hintStyle]}
            numberOfLines={1}
            onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
          >
            {hint}
          </Animated.Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
  input: {
    color: colors.textPrimary,
    fontSize: 14,
    fontFamily: fonts.montserrat,
  },
  hintLayer: {
    position: 'absolute',
    left: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  hint: {
    color: 'rgba(232,163,77,0.62)',
    fontSize: 15,
    fontFamily: fonts.megrim,
    letterSpacing: 1,
  },
});
