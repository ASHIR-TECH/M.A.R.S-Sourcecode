import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from '@/components/StatusBar';
import { colours, fontSizes, radii, spacing, touchTarget } from '@/constants/colours';
import { AppError } from '@/api/client';
import { getHealth } from '@/api/health';
import { useAuth } from '@/contexts/AuthContext';
import { useAgent } from '@/contexts/AgentContext';
import { useBiometric } from '@/hooks/useBiometric';
import { useNotifications } from '@/hooks/useNotifications';

type TestState = 'idle' | 'testing' | 'success' | 'error';

export default function SettingsScreen() {
  const router = useRouter();
  const { apiUrl, signOut, connect, connecting } = useAuth();
  const { status: agentStatus } = useAgent();
  const biometric = useBiometric();
  const notifications = useNotifications();

  const [urlDraft, setUrlDraft] = useState(apiUrl ?? '');
  const [tokenDraft, setTokenDraft] = useState('');
  const [testState, setTestState] = useState<TestState>('idle');
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const runTest = async () => {
    setTestState('testing');
    setTestMessage(null);
    try {
      await getHealth(urlDraft);
      setTestState('success');
      setTestMessage('Connected — desktop peer reachable.');
    } catch (e) {
      setTestState('error');
      setTestMessage(
        e instanceof AppError && e.code === 'NETWORK'
          ? 'Unreachable. Make sure ADTP is running on the desktop.'
          : e instanceof Error
            ? e.message
            : 'Connection failed.'
      );
    }
  };

  const updateCredentials = async () => {
    setSavedMessage(null);
    try {
      await connect(urlDraft, tokenDraft.trim() || '');
      setSavedMessage('Credentials updated.');
      setTokenDraft('');
    } catch (e) {
      setSavedMessage(
        e instanceof Error ? e.message : 'Failed to update credentials.'
      );
    }
  };

  const doSignOut = async () => {
    await notifications.disable();
    await signOut();
    router.replace('/setup');
  };

  return (
    <View style={styles.screen}>
      <StatusBar />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Connection */}
        <Text style={styles.sectionTitle}>Connection</Text>
        <View style={styles.card}>
          <Text style={styles.label}>API URL</Text>
          <TextInput
            style={styles.input}
            value={urlDraft}
            onChangeText={setUrlDraft}
            placeholder="http://your-desktop-ip:40003"
            placeholderTextColor={colours.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Pressable
            onPress={runTest}
            disabled={testState === 'testing' || !urlDraft.trim()}
            style={({ pressed }) => [
              styles.buttonGhost,
              (testState === 'testing' || !urlDraft.trim()) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {testState === 'testing' ? (
              <ActivityIndicator color={colours.textPrimary} />
            ) : (
              <>
                <Ionicons name="pulse-outline" size={16} color={colours.textPrimary} />
                <Text style={styles.buttonGhostText}>Test Connection</Text>
              </>
            )}
          </Pressable>
          {testMessage ? (
            <View
              style={[
                styles.inline,
                testState === 'error'
                  ? styles.inlineError
                  : testState === 'success'
                    ? styles.inlineSuccess
                    : null,
              ]}
            >
              <Ionicons
                name={testState === 'error' ? 'close-circle' : 'checkmark-circle'}
                size={16}
                color={testState === 'error' ? colours.danger : colours.success}
              />
              <Text
                style={[
                  styles.inlineText,
                  { color: testState === 'error' ? colours.danger : colours.success },
                ]}
              >
                {testMessage}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Authentication */}
        <Text style={styles.sectionTitle}>Authentication</Text>
        <View style={styles.card}>
          <Text style={styles.label}>
            {apiUrl ? 'API Token (stored — enter a new one to replace)' : 'API Token'}
          </Text>
          <TextInput
            style={styles.input}
            value={tokenDraft}
            onChangeText={setTokenDraft}
            placeholder={apiUrl ? '••••••••••••••••' : 'Enter your ADTP API token'}
            placeholderTextColor={colours.textSecondary}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            onPress={updateCredentials}
            disabled={connecting || !tokenDraft.trim() || !urlDraft.trim()}
            style={({ pressed }) => [
              styles.buttonPrimary,
              (connecting || !tokenDraft.trim() || !urlDraft.trim()) && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {connecting ? (
              <ActivityIndicator color={colours.textOnGold} />
            ) : (
              <Text style={styles.buttonPrimaryText}>Update Token</Text>
            )}
          </Pressable>
          {savedMessage ? (
            <Text
              style={[
                styles.inlineText,
                { color: savedMessage.startsWith('Credentials updated') ? colours.success : colours.danger },
              ]}
            >
              {savedMessage}
            </Text>
          ) : null}
        </View>

        {/* Agent */}
        <Text style={styles.sectionTitle}>Agent</Text>
        <View style={styles.card}>
          <View style={styles.agentRow}>
            <View
              style={[
                styles.agentDot,
                { backgroundColor: agentStatus?.status === 'active' ? colours.success : colours.textSecondary },
              ]}
            />
            <Text style={styles.agentLabel}>
              {agentStatus?.status === 'active' ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <View style={styles.agentMeta}>
            <Text style={styles.metaText}>Provider</Text>
            <Text style={styles.metaValue}>{agentStatus?.provider ?? '—'}</Text>
            <Text style={styles.metaText}>Model</Text>
            <Text style={styles.metaValue}>{agentStatus?.model ?? '—'}</Text>
          </View>
          <Text style={styles.hint}>
            Change agent settings on your desktop — this screen is read-only.
          </Text>
        </View>

        {/* Security */}
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Biometric unlock</Text>
              <Text style={styles.toggleHint}>Face ID / Touch ID before showing content</Text>
            </View>
            <Switch
              value={biometric.enabled}
              onValueChange={() => biometric.toggle()}
              disabled={!biometric.isAvailable}
              trackColor={{ true: colours.gold, false: colours.purpleDim }}
              thumbColor={biometric.enabled ? colours.textOnGold : colours.textSecondary}
            />
          </View>
          {!biometric.isAvailable ? (
            <Text style={styles.hint}>No biometric hardware detected on this device.</Text>
          ) : null}
        </View>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Push notifications</Text>
              <Text style={styles.toggleHint}>
                File delivered, task done, peer online
              </Text>
            </View>
            <Switch
              value={notifications.enabled}
              onValueChange={(on) => {
                if (on) {
                  void notifications.enable();
                } else {
                  void notifications.disable();
                }
              }}
              trackColor={{ true: colours.gold, false: colours.purpleDim }}
              thumbColor={notifications.enabled ? colours.textOnGold : colours.textSecondary}
            />
          </View>
          {notifications.error ? (
            <Text style={styles.errorText}>{notifications.error}</Text>
          ) : null}
        </View>

        {/* Sign out */}
        <Pressable
          onPress={() => (confirmSignOut ? doSignOut() : setConfirmSignOut(true))}
          style={({ pressed }) => [
            styles.signOut,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="log-out-outline" size={18} color={colours.danger} />
          <Text style={styles.signOutText}>
            {confirmSignOut ? 'Tap again to confirm' : 'Sign out'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colours.bgDeep,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    color: colours.textSecondary,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colours.bgSurface,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    borderRadius: radii.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  label: {
    color: colours.textSecondary,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
  },
  input: {
    backgroundColor: colours.bgSurfaceAlt,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colours.textPrimary,
    fontSize: fontSizes.md,
    minHeight: touchTarget,
  },
  buttonGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: touchTarget,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    backgroundColor: colours.bgSurfaceAlt,
  },
  buttonGhostText: {
    color: colours.textPrimary,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  buttonPrimary: {
    minHeight: touchTarget,
    borderRadius: radii.md,
    backgroundColor: colours.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimaryText: {
    color: colours.textOnGold,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineError: {},
  inlineSuccess: {},
  inlineText: {
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
    flexShrink: 1,
  },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  agentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  agentLabel: {
    color: colours.textPrimary,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  agentMeta: {
    gap: 2,
  },
  metaText: {
    color: colours.textSecondary,
    fontSize: fontSizes.xs,
    fontFamily: 'Offside',
    marginTop: spacing.sm,
  },
  metaValue: {
    color: colours.textPrimary,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    color: colours.textPrimary,
    fontSize: fontSizes.md,
    fontFamily: 'Offside',
  },
  toggleHint: {
    color: colours.textSecondary,
    fontSize: fontSizes.xs,
    fontFamily: 'Offside',
    marginTop: 2,
  },
  hint: {
    color: colours.textSecondary,
    fontSize: fontSizes.xs,
    fontFamily: 'Offside',
  },
  errorText: {
    color: colours.danger,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: touchTarget,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colours.danger,
  },
  signOutText: {
    color: colours.danger,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
});
