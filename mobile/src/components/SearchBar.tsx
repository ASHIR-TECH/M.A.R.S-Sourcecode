import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? 'Search…'}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        accessibilityLabel="Search active systems or peers" /**this is the wordings for the search for active systems and history */
        accessibilityRole="search"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    color: colors.textPrimary,
    fontSize: 14,
  },
});
