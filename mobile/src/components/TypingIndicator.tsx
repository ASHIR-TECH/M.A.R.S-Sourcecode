import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

/** Animated "thinking" indicator — three bouncing dots inside a glass bubble,
 * mimicking the classic iMessage/WhatsApp typing style. */
export function TypingIndicator() {
  const anims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 140),
          Animated.timing(anim, { toValue: 1, duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [anims]);

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        {anims.map((anim, i) => {
          const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
          const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
          return (
            <Animated.View
              key={i}
              style={[styles.dot, { transform: [{ translateY }], opacity }]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(247, 247, 246, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
});
