import React, { useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, Linking, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { GitHubIcon } from '../../components/icons/GitHubIcon';
import { XIcon } from '../../components/icons/XIcon';
import { EmailIcon } from '../../components/icons/EmailIcon';
import { DiscordIcon } from '../../components/icons/DiscordIcon';
import { RickRollScreen } from './RickRollScreen';

type Channel =
  | { key: string; label: string; sub: string; Icon: typeof GitHubIcon; image?: undefined; url: string }
  | { key: string; label: string; sub: string; Icon?: typeof GitHubIcon; image?: number; url: string }
  | { key: string; label: string; sub: string; Icon?: typeof GitHubIcon; image: number; action: 'mystery' };

const CHANNELS: Channel[] = [
  { key: 'github', label: 'GitHub', sub: 'Open an issue / star the repo', Icon: GitHubIcon, url: 'https://github.com/ASHIR-TECH/M.A.R.S-Sourcecode' },
  { key: 'x', label: 'X', sub: 'Pitch with the Dev', Icon: XIcon, url: 'https://x.com/Ashir_Official' },
  { key: 'email', label: 'Email', sub: 'Support@Ashir.io', Icon: EmailIcon, url: 'mailto:ashir.support.mail@googlte.com?subject=MARS%20Support%20Ticket' },
  { key: 'whatsapp', label: 'WhatsApp', sub: 'Chat with the Dev', image: require('../../../assets/images/whatsapp.png'), url: 'https://wa.me/+2348158378585' },
  { key: 'discord', label: 'Discord', sub: 'Join the server', Icon: DiscordIcon, url: 'https://discord.gg/x_contractor_x' },
  { key: 'mystery', label: '???', sub: 'Do not touch', image: require('../../../assets/images/box.png'), action: 'mystery' },
];

interface SupportScreenProps {
  onClose: () => void;
}

export function SupportScreen({ onClose }: SupportScreenProps) {
  const [mysteryOpen, setMysteryOpen] = useState(false);

  if (mysteryOpen) {
    return <RickRollScreen onClose={() => setMysteryOpen(false)} />;
  }

  const handlePress = (channel: Channel) => {
    if (channel.key === 'mystery') {
      setMysteryOpen(true);
      return;
    }
    if ('url' in channel) void Linking.openURL(channel.url);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="Close support">
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.kicker}>GET IN TOUCH</Text>
        <Text style={styles.title}>REACH THE DEV</Text>
        <Text style={styles.subtitle}>Connect with the person building and maintaing Mars.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {CHANNELS.map((channel) => {
          const { key, label, sub, Icon, image } = channel;
          return (
            <Pressable
              key={key}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => handlePress(channel)}
              accessibilityRole="button"
              accessibilityLabel={`${label}: ${sub}`}
            >
              <View style={styles.iconWrap}>
                {image ? (
                  <Image source={image} style={styles.cardImage} />
                ) : (
                  Icon && <Icon size={32} />
                )}
              </View>
              <Text style={styles.cardLabel}>{label}</Text>
              <Text style={styles.cardSub}>{sub}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: spacing.xxl + 24, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  closeButton: {
    position: 'absolute',
    top: spacing.xxl,
    right: spacing.lg,
    padding: spacing.sm,
  },
  closeText: { color: colors.textMuted, fontSize: 18 },
  kicker: {
    color: colors.accent,
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: '700',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    width: 150,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(215,128,30,0.3)',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardPressed: { backgroundColor: 'rgba(255,255,255,0.09)' },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(232,163,77,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    tintColor: colors.accent, // match the amber/orange feel of the SVG icons
  },
  cardLabel: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  cardSub: { color: colors.textMuted, fontSize: 11, textAlign: 'center' },
});
