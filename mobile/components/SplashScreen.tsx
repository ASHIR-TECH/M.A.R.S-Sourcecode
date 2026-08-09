import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { GradientText } from '@/components/GradientText';
import { colours } from '@/constants/colours';

const WORDMARK_FADE_MS = 600;
const WORDMARK_DELAY_MS = 200;
const TAGLINE_DELAY_MS = WORDMARK_DELAY_MS + WORDMARK_FADE_MS + 200;
const LINE_FILL_MS = 800;
const LINE_DELAY_MS = TAGLINE_DELAY_MS + 100;

/**
 * React Native splash shown once the native splash hides. Runs the wordmark
 * fade-in, tagline and loading-line animations, then reports back via
 * `onReady` so the parent can fade the whole screen out.
 */
export function SplashScreen({ onReady }: { onReady: () => void }) {
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkY = useSharedValue(8);
  const taglineOpacity = useSharedValue(0);
  const lineProgress = useSharedValue(0);

  useEffect(() => {
    wordmarkOpacity.value = withDelay(
      WORDMARK_DELAY_MS,
      withTiming(1, { duration: WORDMARK_FADE_MS, easing: Easing.in(Easing.ease) })
    );
    wordmarkY.value = withDelay(
      WORDMARK_DELAY_MS,
      withTiming(0, { duration: WORDMARK_FADE_MS, easing: Easing.in(Easing.ease) })
    );
    taglineOpacity.value = withDelay(
      TAGLINE_DELAY_MS,
      withTiming(1, { duration: WORDMARK_FADE_MS, easing: Easing.in(Easing.ease) })
    );
    lineProgress.value = withDelay(
      LINE_DELAY_MS,
      withTiming(1, { duration: LINE_FILL_MS, easing: Easing.out(Easing.ease) }, () => {
        onReady();
      })
    );
    return () => {
      cancelAnimation(wordmarkOpacity);
      cancelAnimation(wordmarkY);
      cancelAnimation(taglineOpacity);
      cancelAnimation(lineProgress);
    };
  }, [wordmarkOpacity, wordmarkY, taglineOpacity, lineProgress, onReady]);

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ translateY: wordmarkY.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineOpacity.value }));

  const lineStyle = useAnimatedStyle(() => ({
    width: `${lineProgress.value * 100}%`,
  }));

  return (
    <View style={styles.screen}>
      <View style={styles.center}>
        <Animated.View style={wordmarkStyle}>
          <GradientText style={styles.wordmark}>MARS</GradientText>
        </Animated.View>
        <Animated.View style={taglineStyle}>
          <Text style={styles.tagline}>Agent Direct Transfer Protocol</Text>
        </Animated.View>
        <View style={styles.lineTrack}>
          <Animated.View style={[styles.lineFill, lineStyle]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colours.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
  },
  wordmark: {
    fontSize: 48,
    fontFamily: 'Audiowide',
    letterSpacing: 6,
  },
  tagline: {
    color: colours.textMuted,
    fontSize: 13,
    fontFamily: 'Offside',
    marginTop: 8,
  },
  lineTrack: {
    marginTop: 20,
    height: 2,
    width: 160,
    backgroundColor: colours.bgOverlay,
    borderRadius: 1,
    overflow: 'hidden',
  },
  lineFill: {
    height: 2,
    backgroundColor: colours.gold,
    borderRadius: 1,
  },
});
