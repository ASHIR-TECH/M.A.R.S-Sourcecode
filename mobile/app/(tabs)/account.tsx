import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { getReady } from '@/api/health';
import { colours, fontSizes, radii, spacing, touchTarget } from '@/constants/colours';
import { useAuth } from '@/contexts/AuthContext';
import { useBiometric } from '@/hooks/useBiometric';
import { useNotifications } from '@/hooks/useNotifications';
import { useOAuth } from '@/hooks/useOAuth';
import { isGoogleConfigured } from '@/constants/auth';

const ASHIR_URL = 'https://ashir.world';
const VERSION = '1.0.0';
const BUILD = String(Constants.expoConfig?.android?.versionCode ?? 1);

export default function AccountScreen() {
  const router = useRouter();
  const { apiUrl, profile, saveApiUrl, signOut, connecting } = useAuth();
  const { isAvailable, enabled: biometricEnabled, toggle: toggleBiometric } = useBiometric();
  const notifications = useNotifications();
  const { busy: oauthBusy, error: oauthError, beginGoogle, beginApple } = useOAuth();

  const [url, setUrl] = useState(apiUrl ?? '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  useEffect(() => {
    setUrl(apiUrl ?? '');
  }, [apiUrl]);

  const testConnection = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await getReady(url);
      setTestResult('ok');
      setTimeout(() => setTestResult(null), 2000);
    } catch {
      setTestResult('fail');
    } finally {
      setTesting(false);
    }
  }, [url]);

  const saveUrl = useCallback(async () => {
    try {
      await saveApiUrl(url);
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(null), 2000);
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : 'Could not save URL.');
    }
  }, [url, saveApiUrl]);

  const onSignOut = useCallback(async () => {
    setConfirmSignOut(false);
    await signOut();
    router.replace('/login');
  }, [signOut, router]);

  const providerConfigured = isGoogleConfigured || Platform.OS === 'ios';
  const updateToken = useCallback(async () => {
    if (profile?.provider === 'apple' && Platform.OS === 'ios') {
      await beginApple();
    } else if (isGoogleConfigured) {
      await beginGoogle();
    } else if (Platform.OS === 'ios') {
      await beginApple();
    }
  }, [profile?.provider, isGoogleConfigured, beginGoogle, beginApple]);

  const initial = (profile?.display_name ?? '?').trim().charAt(0).toUpperCase() || '?';
  const providerLabel = profile?.provider === 'apple' ? 'Apple' : 'Google';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.displayName} numberOfLines={1}>
              {profile?.display_name ?? 'MARS user'}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {profile?.email ?? 'Signed in with ' + providerLabel}
            </Text>
          </View>
          {profile ? (
            <View style={styles.providerBadge}>
              <Ionicons
                name={profile.provider === 'apple' ? 'logo-apple' : 'logo-google'}
                size={12}
                color={colours.gold}
              />
              <Text style={styles.providerBadgeText}>{providerLabel}</Text>
            </View>
          ) : null}
        </View>

        <Section title="Connection">
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              placeholder="Desktop API URL"
              placeholderTextColor={colours.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              testID="api-url-input"
            />
          </View>
          <View style={styles.rowButtons}>
            <Pressable
              onPress={saveUrl}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>Save URL</Text>
            </Pressable>
            {testResult === 'ok' ? (
              <View style={styles.okPill}>
                <Ionicons name="checkmark-circle" size={16} color={colours.stateSuccess} />
                <Text style={styles.okText}>Connected</Text>
              </View>
            ) : (
              <Pressable
                onPress={testConnection}
                disabled={testing || !url.trim()}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  (testing || !url.trim()) && styles.disabled,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
              >
                {testing ? (
                  <ActivityIndicator color={colours.gold} size="small" />
                ) : (
                  <Text style={styles.secondaryButtonText}>Test Connection</Text>
                )}
              </Pressable>
            )}
          </View>
          {testResult === 'fail' ? (
            <Text style={styles.errorText}>Could not reach the desktop at that URL.</Text>
          ) : null}
          {saveMsg ? <Text style={styles.hintText}>{saveMsg}</Text> : null}
        </Section>

        <Section title="Security">
          <View style={styles.rowBetween}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>Biometric unlock</Text>
              <Text style={styles.rowHint}>
                {isAvailable
                  ? 'Require Face ID / Touch ID on every open.'
                  : 'Not available on this device.'}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={toggleBiometric}
              disabled={!isAvailable}
              trackColor={{ false: colours.bgOverlay, true: colours.goldDim }}
              thumbColor={biometricEnabled ? colours.gold : colours.textMuted}
              accessibilityLabel="Biometric unlock"
            />
          </View>
          <Pressable
            onPress={updateToken}
            disabled={oauthBusy || connecting || !providerConfigured}
            style={({ pressed }) => [
              styles.secondaryButton,
              (oauthBusy || connecting) && styles.disabled,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
          >
            {oauthBusy ? (
              <ActivityIndicator color={colours.gold} size="small" />
            ) : (
              <Text style={styles.secondaryButtonText}>Update Token</Text>
            )}
          </Pressable>
          {oauthError ? <Text style={styles.errorText}>{oauthError}</Text> : null}
        </Section>

        <Section title="Notifications">
          <View style={styles.rowBetween}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowLabel}>Push notifications</Text>
              <Text style={styles.rowHint}>
                {notifications.supported
                  ? 'Receive file and agent alerts on this device.'
                  : 'Push needs a development build — unavailable in Expo Go.'}
              </Text>
            </View>
            <Switch
              value={notifications.enabled}
              onValueChange={(v) => {
                if (v) void notifications.enable();
                else void notifications.disable();
              }}
              disabled={!notifications.supported}
              trackColor={{ false: colours.bgOverlay, true: colours.goldDim }}
              thumbColor={notifications.enabled ? colours.gold : colours.textMuted}
              accessibilityLabel="Push notifications"
            />
          </View>
          {notifications.error ? (
            <Text style={styles.errorText}>{notifications.error}</Text>
          ) : null}
        </Section>

        <Section title="App info">
          <View style={styles.rowBetween}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>MARS v{VERSION} ({BUILD})</Text>
          </View>
          <Pressable
            onPress={() => Linking.openURL(ASHIR_URL)}
            style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
            accessibilityRole="link"
          >
            <Ionicons name="globe-outline" size={16} color={colours.gold} />
            <Text style={styles.linkText}>ashir.world</Text>
          </Pressable>
        </Section>

        <Pressable
          onPress={() => setConfirmSignOut(true)}
          style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]}
          accessibilityRole="button"
          testID="sign-out-button"
        >
          <Ionicons name="log-out-outline" size={18} color={colours.ember} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={confirmSignOut}
        transparent
        animationType="slide"
        onRequestClose={() => setConfirmSignOut(false)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Sign out of MARS?</Text>
            <Text style={styles.sheetBody}>
              Your ADTP API token will be removed from this device. You will need to sign in again.
            </Text>
            <View style={styles.sheetButtons}>
              <Pressable
                onPress={() => setConfirmSignOut(false)}
                style={({ pressed }) => [styles.sheetButton, pressed && styles.pressed]}
              >
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={onSignOut}
                style={({ pressed }) => [
                  styles.sheetButton,
                  styles.sheetDestructive,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.sheetDestructiveText}>Sign Out</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colours.bgDeep,
  },
  flex: {
    flex: 1,
  },
  header: {
    height: 56,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    backgroundColor: colours.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: colours.purpleDim,
  },
  title: {
    color: colours.textPrimary,
    fontSize: 22,
    fontFamily: 'Audiowide',
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.lg,
    backgroundColor: colours.bgSurface,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colours.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colours.bgDeep,
    fontSize: 20,
    fontFamily: 'Audiowide',
  },
  profileInfo: {
    flex: 1,
  },
  displayName: {
    color: colours.textPrimary,
    fontSize: 18,
    fontFamily: 'Audiowide',
  },
  email: {
    color: colours.textMuted,
    fontSize: 13,
    fontFamily: 'Offside',
    marginTop: 2,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colours.goldDim,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  providerBadgeText: {
    color: colours.gold,
    fontSize: 11,
    fontFamily: 'Offside',
  },
  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colours.textSecondary,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionCard: {
    backgroundColor: colours.bgSurface,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    gap: spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: touchTarget,
  },
  rowInfo: {
    flex: 1,
  },
  rowLabel: {
    color: colours.textPrimary,
    fontSize: 14,
    fontFamily: 'Offside',
  },
  rowHint: {
    color: colours.textMuted,
    fontSize: 12,
    fontFamily: 'Offside',
    marginTop: 2,
  },
  rowValue: {
    color: colours.textSecondary,
    fontSize: 13,
    fontFamily: 'Offside',
  },
  input: {
    backgroundColor: colours.bgOverlay,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colours.textPrimary,
    fontSize: 14,
    minHeight: touchTarget,
    fontFamily: 'Offside',
  },
  rowButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    minHeight: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.bgElevated,
    borderWidth: 1,
    borderColor: colours.goldDim,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    color: colours.gold,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Offside',
  },
  okPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: touchTarget,
    backgroundColor: colours.bgElevated,
    borderWidth: 1,
    borderColor: colours.stateSuccess,
    borderRadius: radii.md,
  },
  okText: {
    color: colours.stateSuccess,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Offside',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: touchTarget,
  },
  linkText: {
    color: colours.gold,
    fontSize: 13,
    fontFamily: 'Offside',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    minHeight: touchTarget,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colours.ember,
    backgroundColor: 'transparent',
  },
  signOutText: {
    color: colours.ember,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Offside',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
  errorText: {
    color: colours.ember,
    fontSize: 12,
    fontFamily: 'Offside',
  },
  hintText: {
    color: colours.textMuted,
    fontSize: 12,
    fontFamily: 'Offside',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: colours.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colours.bgSurface,
    borderTopWidth: 1,
    borderTopColor: colours.purpleDim,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  sheetTitle: {
    color: colours.textPrimary,
    fontSize: 18,
    fontFamily: 'Audiowide',
  },
  sheetBody: {
    color: colours.textSecondary,
    fontSize: 13,
    fontFamily: 'Offside',
    lineHeight: 20,
  },
  sheetButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sheetButton: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colours.bgElevated,
    borderWidth: 1,
    borderColor: colours.purpleDim,
  },
  sheetDestructive: {
    borderColor: colours.ember,
  },
  sheetCancelText: {
    color: colours.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Offside',
  },
  sheetDestructiveText: {
    color: colours.ember,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Offside',
  },
});
