import React from 'react';
import { Pressable, Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { glass } from '../../theme/glass';
import { styles } from './OAuthButton.styles';

interface OAuthButtonProps {
  label: string;
  icon?: React.ReactNode;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function OAuthButton({ label, icon, onPress, loading, disabled }: OAuthButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        (disabled || loading) && styles.buttonDisabled,
      ]}
    >
      <BlurView
        intensity={glass.intensity}
        tint={glass.tint}
        style={StyleSheet.absoluteFill}
      />
      {loading ? (
        <ActivityIndicator color="#F5EFE6" />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}
