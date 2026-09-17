import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { TAB_CONFIG } from './tabConfig';

/**
 * Drag-follow tab pager (no native pager dependency): all four tab screens
 * live in one horizontal row that tracks the finger during a horizontal pan
 * and springs to the nearest page on release. Vertical scrolling still wins
 * because the pan only activates on a horizontal-dominant drag.
 *
 * Screens are lazily mounted, keeping the active page's immediate neighbours
 * mounted so their content is already there while you drag, and any page you
 * have visited stays mounted so its local state survives swiping away.
 */
const SPRING = { damping: 22, stiffness: 190, mass: 0.7 };
const MOMENTUM = 0.18;

interface PagerTabViewProps {
  index: number;
  onIndexChange: (index: number) => void;
}

export function PagerTabView({ index, onIndexChange }: PagerTabViewProps) {
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(-index * width);
  const indexSV = useSharedValue(index);
  const [visited, setVisited] = useState<Set<string>>(
    () => new Set([TAB_CONFIG[index].name])
  );

  useEffect(() => {
    setVisited((prev) => {
      const name = TAB_CONFIG[index].name;
      return prev.has(name) ? prev : new Set(prev).add(name);
    });
  }, [index]);

  // Animate to the active page whenever the index changes from outside the
  // pager (tab-bar taps).
  useEffect(() => {
    indexSV.value = index;
    translateX.value = withSpring(-index * width, SPRING);
  }, [index, width, indexSV, translateX]);

  const selectIndex = useCallback(
    (next: number) => {
      if (next !== index) onIndexChange(next);
    },
    [index, onIndexChange]
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        // Only claim the gesture once the drag is clearly horizontal; a
        // vertical drag fails the pan so inner ScrollViews keep scrolling.
        .activeOffsetX([-12, 12])
        .failOffsetY([-16, 16])
        .onUpdate((event) => {
          const base = -indexSV.value * width;
          const min = -(TAB_CONFIG.length - 1) * width;
          const next = base + event.translationX;
          translateX.value = Math.min(0, Math.max(min, next));
        })
        .onEnd((event) => {
          const from = indexSV.value;
          const projected = -from * width + event.translationX + event.velocityX * MOMENTUM;
          const target = Math.max(
            0,
            Math.min(TAB_CONFIG.length - 1, Math.round(-projected / width))
          );
          translateX.value = withSpring(-target * width, SPRING);
          runOnJS(selectIndex)(target);
        }),
    [width, selectIndex, translateX, indexSV]
  );

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.viewport} collapsable={false}>
        <Animated.View style={[styles.row, { width: width * TAB_CONFIG.length }, rowStyle]}>
          {TAB_CONFIG.map(({ name, component: Component }, i) => (
            <View key={name} style={[styles.page, { width }]}>
              {visited.has(name) || Math.abs(i - index) <= 1 ? <Component /> : null}
            </View>
          ))}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', height: '100%' },
  page: { height: '100%' },
});
