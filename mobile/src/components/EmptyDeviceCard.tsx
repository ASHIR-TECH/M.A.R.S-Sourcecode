import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { glass } from '../theme/glass';
import { spacing } from '../theme/spacing';

function EmptyDeviceCardBase() {
  return (
    <View style={styles.card}>
      <BlurView
        intensity={glass.intensity}
        tint={glass.tint}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

export const EmptyDeviceCard = React.memo(EmptyDeviceCardBase);

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(37, 17, 1, 0.62)',
    borderRadius: glass.radius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(215, 128, 30, 0.7)',
    width: '100%',
    minHeight: 120,
    padding: spacing.md,
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
