import React, { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { Avatar } from '../../components/Avatar';
import { SettingsSection } from '../../components/SettingsSection';
import { SettingsRow } from '../../components/SettingsRow';
import { SupportScreen } from '../Support/SupportScreen';
import { initialsFrom } from './initialsFrom';
import { styles } from './ProfileScreen.styles';

interface ProfileScreenProps {
  onNavigatePrivacy?: () => void;
}

export function ProfileScreen({ onNavigatePrivacy }: ProfileScreenProps) {
  const { session, signOut } = useAuthStore();
  const [supportOpen, setSupportOpen] = useState(false);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  if (supportOpen) {
    return <SupportScreen onClose={() => setSupportOpen(false)} />;
  }

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
        <SettingsRow label="Help & Support" onPress={() => setSupportOpen(true)} />
      </SettingsSection>

      <SettingsSection>
        <SettingsRow label="Sign Out" onPress={handleSignOut} destructive showChevron={false} />
      </SettingsSection>
    </ScrollView>
  );
}
