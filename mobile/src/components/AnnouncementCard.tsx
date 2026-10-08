import React from 'react';
import { StyleSheet, Text, View, StyleProp, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

interface AnnouncementCardProps {
  title?: string;
  message?: string;
  style?: StyleProp<ViewStyle>;
}

export function AnnouncementCard({ title = 'System Notice', message = 'All systems operational.', style }: AnnouncementCardProps) {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(232,163,77,0.5)',
    padding: 12,
    marginBottom: 12,
  },
  title: {
    color: colors.accent,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
