import React from 'react';
import { View, Text, ScrollView, Alert, Linking } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { Avatar } from '../../components/Avatar';
import { SettingsSection } from '../../components/SettingsSection';
import { SettingsRow } from '../../components/SettingsRow';
import { initialsFrom } from './initialsFrom';
import { styles } from './ProfileScreen.styles';

// Support contact points for the Help & Support popup (swap for real values).
const SUPPORT_EMAIL = 'support@mars.io';
const SUPPORT_PHONE = '18005550199';

interface ProfileScreenProps {
  onNavigatePrivacy?: () => void;
}

export function ProfileScreen({ onNavigatePrivacy }: ProfileScreenProps) {
  const { session, signOut } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const handleHelp = () => {
    Alert.alert('Help & Support', 'How would you like to reach us?', [
      { text: 'Email Support', onPress: () => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`) },
      { text: 'Call Support', onPress: () => void Linking.openURL(`tel:${SUPPORT_PHONE}`) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Avatar
          photoUrl={session?.photoUrl}
          fallbackInitials={initialsFrom(session?.fullName, session?.email)}
          size={72}
        />
        <Text style={styles.name}>{session?.fullName ?? 'Operator'}</Text>
        <Text style={styles.email}>{session?.email ?? ''}</Text>
        <Text style={styles.provider}>
          Signed in with {session?.provider === 'github' ? 'GitHub' : 'Google'}
        </Text>
      </View>

      <SettingsSection title="Paired Desktop">
        <SettingsRow label="No devices paired" showChevron={false} />
      </SettingsSection>

      <SettingsSection title="Preferences">
        <SettingsRow label="Privacy & Security" onPress={onNavigatePrivacy} />
      </SettingsSection>

      <SettingsSection title="Support">
        <SettingsRow label="Help & Support" onPress={handleHelp} />
      </SettingsSection>

      <SettingsSection>
        <SettingsRow label="Sign Out" onPress={handleSignOut} destructive showChevron={false} />
      </SettingsSection>
    </ScrollView>
  );
}
