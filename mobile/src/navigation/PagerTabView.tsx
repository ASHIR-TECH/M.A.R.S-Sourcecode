import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { TAB_CONFIG } from './tabConfig';

/**
 * Tab pager with a single wrap (no native pager dependency): the four tabs are
 * laid out as [Home, Chats, Devices, Settings] plus one repeated Home copy on
 * the right — [Home, Chats, Devices, Settings, Home]. That turns the hardest
 * tab-bar jump (Settings → Home, previously a 3-page slide left) into a
 * one-step slide right that lands on the repeated Home, pixel-identically.
 * Only the first tab is duplicated, so the ring stays at 5 mounted pages and
 * the rest of the app behaves exactly as a plain 4-tab pager.
 *
 * Every screen is always mounted, so swipes reveal no blank frames and stay
 * purely on the UI thread. Settles use one clean timing (~220ms) — fast enough
 * to land instantly, slow enough not to smear the live camera.
 */
const N = TAB_CONFIG.length;
const PAGES = N + 1;
const INITIAL_POS = 0; // Home (tab 0) starts at page 0.
const MOMENTUM = 0.15;
const SETTLE_MS = 220;

interface PagerTabViewProps {
  index: number;
  onIndexChange: (index: number) => void;
  /** Extra per-tab props handed to each screen by name (stable references). */
  screenProps?: Record<string, object>;
}

/** Shortest signed step around the ring from `fromLogical` to `toLogical`. */
function shortestStep(fromLogical: number, toLogical: number): number {
  let step = ((toLogical - fromLogical) % N + N) % N;
  if (step > N / 2) step -= N;
  return step;
}

/** Wrap an absolute page position into the rendered row [0, PAGES - 1]. */
function wrapPage(page: number): number {
  if (page < 0) return page + N;
  if (page > PAGES - 1) return page - N;
  return page;
}

export function PagerTabView({ index, onIndexChange, screenProps }: PagerTabViewProps) {
  const { width } = useWindowDimensions();
  const posSV = useSharedValue(INITIAL_POS);
  const startPosSV = useSharedValue(0);

  const posRef = useRef(INITIAL_POS);
  const [pos, setPosState] = useState(INITIAL_POS);

  // React reflects the settled page only; the shared value drives pixels.
  const settle = useCallback(
    (target: number) => {
      posRef.current = target;
      setPosState(target);
      const logical = ((target % N) + N) % N;
      if (logical !== index) onIndexChange(logical);
    },
    [index, onIndexChange]
  );

  // Shortest-step animation whenever the index changes from outside the pager
  // (tab-bar taps, the Home SCAN button). A wrap lands pixel-identically.
  useEffect(() => {
    const prev = posRef.current;
    const step = shortestStep((prev % N + N) % N, index);
    const target = wrapPage(prev + step);
    if (target !== prev) {
      posRef.current = target;
      setPosState(target);
      posSV.value = withTiming(target, { duration: SETTLE_MS });
    }
  }, [index, posSV]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        // Only claim the gesture once the drag is clearly horizontal; a
        // vertical drag fails the pan so inner ScrollViews keep scrolling.
        .activeOffsetX([-12, 12])
        .failOffsetY([-16, 16])
        .onStart(() => {
          startPosSV.value = posSV.value;
        })
        .onUpdate((event) => {
          const next = startPosSV.value + event.translationX / width;
          posSV.value = Math.min(PAGES - 1, Math.max(0, next));
        })
        .onEnd((event) => {
          let projected = Math.round(
            startPosSV.value + event.translationX / width + (event.velocityX * MOMENTUM) / width
          );
          const target = Math.min(PAGES - 1, Math.max(0, projected));
          posSV.value = withTiming(target, { duration: SETTLE_MS });
          runOnJS(settle)(target);
        }),
    [width, settle, posSV, startPosSV]
  );

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -posSV.value * width }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.viewport} collapsable={false}>
        <Animated.View style={[styles.row, { width: width * PAGES }, rowStyle]}>
          {Array.from({ length: PAGES }, (_, k) => {
            const entry = TAB_CONFIG[((k % N) + N) % N];
            const ScreenComponent = entry.component as React.ComponentType<any>;
            // Only the Devices screen consumes the visibility flag.
            const copyProps =
              entry.name === 'Devices'
                ? { ...(screenProps?.[entry.name] ?? {}), activePage: k === pos }
                : { ...(screenProps?.[entry.name] ?? {}) };
            return (
              <View key={`${entry.name}-${k}`} style={[styles.page, { width }]}>
                <ScreenComponent {...copyProps} />
              </View>
            );
          })}
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