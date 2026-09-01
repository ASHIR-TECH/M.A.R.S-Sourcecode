import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useEvent } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const VIDEO_SOURCE = require('../../../assets/video/rickroll.mp4');

interface RickRollScreenProps {
  onClose: () => void;
}

export function RickRollScreen({ onClose }: RickRollScreenProps) {
  const player = useVideoPlayer(VIDEO_SOURCE, (p) => {
    p.loop = false;
    // First attempt — starts as soon as the player exists.
    p.play();
  });

  // Re-issue play() once the source is actually ready to play for native,
  // and to satisfy web autoplay after the opening tap gesture.
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  useEffect(() => {
    if (status === 'readyToPlay') player.play();
  }, [status, player]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Got you :)</Text>
        <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="Close">
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.videoWrap}>
        <VideoView player={player} style={styles.video} contentFit="contain" nativeControls />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: spacing.xxl + 24,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  title: { color: '#E05A47', fontSize: 40, fontWeight: '700', letterSpacing: 4 },
  closeButton: { position: 'absolute', top: spacing.xxl, right: spacing.lg, padding: spacing.sm },
  closeText: { color: colors.textMuted, fontSize: 18 },
  videoWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: spacing.xxl * 3.5,
    paddingHorizontal: spacing.lg,
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#0B0704',
    borderRadius: 16,
  },
});
