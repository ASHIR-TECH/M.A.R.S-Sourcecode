import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colours, spacing } from '@/constants/colours';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.screen}>
      <Ionicons name="compass-outline" size={48} color={colours.gold} />
      <Text style={styles.title}>Page not found</Text>
      <Pressable onPress={() => router.replace('/(tabs)/chat')} style={styles.button}>
        <Text style={styles.buttonText}>Back to Chat</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colours.bgDeep,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  title: {
    color: colours.textPrimary,
    fontSize: 18,
    fontFamily: 'Audiowide',
  },
  button: {
    marginTop: spacing.lg,
    backgroundColor: colours.gold,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: {
    color: colours.textOnGold,
    fontWeight: '600',
  },
});
