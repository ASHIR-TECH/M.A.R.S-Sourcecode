import React from 'react';
import { Pressable, Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import { styles } from './OAuthButton.styles';

interface OAuthButtonProps {
  label: string;
  icon?: React.ReactNode;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  iconPosition?: 'start' | 'end';
}

export function OAuthButton({ label, icon, onPress, loading, disabled, iconPosition = 'start' }: OAuthButtonProps) {
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
      <View style={styles.topGloss} pointerEvents="none" />
      {loading ? (
        <ActivityIndicator color="#F5EFE6" />
      ) : (
        <View style={styles.content}>
          {iconPosition === 'end' && icon}
          <Text style={styles.label}>{label}</Text>
          {iconPosition === 'start' && icon}
        </View>
      )}
    </Pressable>
  );
}