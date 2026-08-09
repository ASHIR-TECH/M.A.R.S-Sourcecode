import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colours } from '@/constants/colours';

const BOUNCE_MS = 600;
const STAGGER_MS = 150;

interface LoadingBubbleProps {
  /** Optional tool name shown above the dots while a tool is executing. */
  toolName?: string | null;
}

function BounceDot({ delay }: { delay: number }) {
  const y = useSharedValue(0);

  useEffect(() => {
    y.value = 0;
    y.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: BOUNCE_MS / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: BOUNCE_MS / 2, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      )
    );
    return () => cancelAnimation(y);
  }, [delay, y]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

/**
 * Animated three-dot typing indicator shown while the agent is responding.
 * Dots bounce on a 600ms loop, staggered 150ms per dot.
 */
export function LoadingBubble({ toolName }: LoadingBubbleProps) {
  return (
    <View style={styles.bubble} testID="loading-bubble">
      {toolName ? (
        <View style={styles.toolRow}>
          <View style={styles.toolSpinner} />
          <Animated.Text style={styles.toolName} numberOfLines={1}>
            Executing {toolName}…
          </Animated.Text>
        </View>
      ) : null}
      <View style={styles.dots}>
        <BounceDot delay={0} />
        <BounceDot delay={STAGGER_MS} />
        <BounceDot delay={STAGGER_MS * 2} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    backgroundColor: colours.bgElevated,
    borderRadius: 14,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '85%',
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolSpinner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colours.purpleMid,
    borderTopColor: colours.purpleBright,
  },
  toolName: {
    color: colours.purpleBright,
    fontSize: 12,
    fontFamily: 'Offside',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colours.gold,
  },
});
