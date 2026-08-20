import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/constants/brand';

type FABProps = {
  onPress?: () => void;
  actions?: Array<{ icon: React.ReactNode; onPress: () => void }>;
};

export function FAB({ onPress, actions }: FABProps) {
  const [expanded, setExpanded] = useState(false);
  const progress = useSharedValue(0);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    progress.value = withTiming(next ? 1 : 0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  };

  const fabStyle = useAnimatedStyle(() => ({
    width: 56 + (expanded ? (actions?.length ?? 0) * 56 : 0),
  }));

  return (
    <View style={styles.container}>
      {expanded && actions ? (
        <Animated.View style={[styles.row, fabStyle]}>
          {actions.map((action, i) => (
            <Animated.View key={i} style={styles.actionWrap}>
              <TouchableOpacity style={styles.actionBtn} onPress={action.onPress}>
                {action.icon}
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>
      ) : null}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          if (actions && actions.length > 0) {
            toggle();
          } else {
            onPress?.();
          }
        }}
      >
        <View style={styles.fabInner} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 96,
    right: 24,
    alignItems: 'flex-end',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionWrap: {},
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabInner: {
    width: 20,
    height: 20,
  },
});
