import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

export function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Settings — coming in a later phase</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  /* transparent so AppBackground's orb shows through, same as every screen */
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.textPrimary },
});