import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppError } from '@/api/client';
import { checkReady, getHealth } from '@/api/health';
import { colours, fontSizes, radii, spacing, touchTarget } from '@/constants/colours';
import { useAuth } from '@/contexts/AuthContext';
import { useBiometric } from '@/hooks/useBiometric';

type Step = 1 | 2 | 3;

export default function SetupScreen() {
  const { isAuthenticated, connect } = useAuth();
  const { isAvailable, authenticate } = useBiometric();

  const [step, setStep] = useState<Step>(1);
  const [apiUrl, setApiUrl] = useState('');
  const [token, setToken] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/chat" />;
  }

  const validateUrl = async () => {
    setWorking(true);
    setError(null);
    try {
      await getHealth(apiUrl);
      setStep(2);
    } catch (e) {
      setError(
        e instanceof AppError && e.code === 'NETWORK'
          ? 'Cannot reach that URL. Make sure adtp-api is running on your desktop.'
          : e instanceof Error
            ? e.message
            : 'Connection failed.'
      );
    } finally {
      setWorking(false);
    }
  };

  const validateToken = async () => {
    setWorking(true);
    setError(null);
    try {
      await checkReady(apiUrl, token);
      setStep(3);
    } catch (e) {
      if (e instanceof AppError && e.code === 'AUTH') {
        setError('Token invalid — double-check your ADTP API token.');
      } else {
        setError(e instanceof Error ? e.message : 'Connection failed.');
      }
    } finally {
      setWorking(false);
    }
  };

  const finishSetup = async (enableBiometric: boolean) => {
    if (enableBiometric) {
      const ok = await authenticate();
      if (!ok) return; // user cancelled — stay on the prompt
    }
    setWorking(true);
    setError(null);
    try {
      await connect(apiUrl, token);
      // isAuthenticated flips -> Redirect above navigates to the app.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed.');
      setWorking(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.brand}>
          <Text style={styles.wordmark}>ADTP</Text>
          <Text style={styles.tagline}>Connect to your desktop</Text>
        </View>

        <View style={styles.progress}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[styles.progressDot, step >= s && styles.progressDotActive]}
            />
          ))}
        </View>

        {step === 1 ? (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>Desktop API URL</Text>
            <Text style={styles.stepHint}>
              The address of your desktop peer&apos;s ADTP REST API.
            </Text>
            <TextInput
              style={styles.input}
              value={apiUrl}
              onChangeText={setApiUrl}
              placeholder="http://your-desktop-ip:40003"
              placeholderTextColor={colours.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!working}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              onPress={validateUrl}
              disabled={!apiUrl.trim() || working}
              style={({ pressed }) => [
                styles.button,
                (!apiUrl.trim() || working) && styles.buttonDisabled,
                pressed && styles.buttonPressed,
              ]}
            >
              {working ? (
                <ActivityIndicator color={colours.textOnGold} />
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>API Token</Text>
            <Text style={styles.stepHint}>
              The same ADTP_API_TOKEN used by the CLI and desktop app. Stored in
              your device&apos;s Keychain / Keystore.
            </Text>
            <TextInput
              style={styles.input}
              value={token}
              onChangeText={setToken}
              placeholder="Enter your ADTP API token"
              placeholderTextColor={colours.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!working}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              onPress={validateToken}
              disabled={!token.trim() || working}
              style={({ pressed }) => [
                styles.button,
                (!token.trim() || working) && styles.buttonDisabled,
                pressed && styles.buttonPressed,
              ]}
            >
              {working ? (
                <ActivityIndicator color={colours.textOnGold} />
              ) : (
                <Text style={styles.buttonText}>Save &amp; Verify</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>Unlock with biometrics?</Text>
            <Text style={styles.stepHint}>
              Use Face ID, Touch ID or a fingerprint to unlock ADTP. Your token
              stays protected behind device authentication.
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {isAvailable ? (
              <View style={styles.biometricRow}>
                <Pressable
                  onPress={() => finishSetup(true)}
                  disabled={working}
                  style={({ pressed }) => [
                    styles.button,
                    styles.buttonPrimary,
                    working && styles.buttonDisabled,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  {working ? (
                    <ActivityIndicator color={colours.textOnGold} />
                  ) : (
                    <Text style={styles.buttonText}>Enable</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => finishSetup(false)}
                  disabled={working}
                  style={({ pressed }) => [
                    styles.button,
                    styles.buttonGhost,
                    working && styles.buttonDisabled,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.buttonGhostText}>Skip</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => finishSetup(false)}
                disabled={working}
                style={({ pressed }) => [
                  styles.button,
                  working && styles.buttonDisabled,
                  pressed && styles.buttonPressed,
                ]}
              >
                {working ? (
                  <ActivityIndicator color={colours.textOnGold} />
                ) : (
                  <Text style={styles.buttonText}>Continue</Text>
                )}
              </Pressable>
            )}
          </View>
        ) : null}

        <Pressable
          onPress={() => (step === 1 ? null : setStep((s) => (s - 1) as Step))}
          disabled={step === 1 || working}
          style={styles.back}
          hitSlop={8}
        >
          {step > 1 ? (
            <View style={styles.backRow}>
              <Ionicons name="arrow-back" size={16} color={colours.textSecondary} />
              <Text style={styles.backText}>Back</Text>
            </View>
          ) : (
            <View style={styles.backRow}>
              <Ionicons name="shield-checkmark" size={16} color={colours.gold} />
              <Text style={styles.backText}>ADTP · Phase A security</Text>
            </View>
          )}
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colours.bgDeep,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  brand: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  wordmark: {
    color: colours.gold,
    fontSize: 40,
    fontFamily: 'Audiowide',
    letterSpacing: 4,
  },
  tagline: {
    color: colours.textSecondary,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
    marginTop: spacing.sm,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.xl,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colours.purpleDim,
  },
  progressDotActive: {
    backgroundColor: colours.gold,
  },
  step: {
    width: '100%',
  },
  stepTitle: {
    color: colours.textPrimary,
    fontSize: fontSizes.xl,
    fontFamily: 'Audiowide',
    textAlign: 'center',
  },
  stepHint: {
    color: colours.textSecondary,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  input: {
    backgroundColor: colours.bgSurface,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colours.textPrimary,
    fontSize: fontSizes.md,
    minHeight: touchTarget,
  },
  error: {
    color: colours.danger,
    fontSize: fontSizes.sm,
    fontFamily: 'Offside',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  button: {
    marginTop: spacing.xl,
    backgroundColor: colours.gold,
    borderRadius: radii.md,
    minHeight: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  buttonPrimary: {
    flex: 1,
    marginTop: 0,
  },
  buttonGhost: {
    flex: 1,
    marginTop: 0,
    backgroundColor: colours.bgSurface,
    borderWidth: 1,
    borderColor: colours.purpleDim,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: colours.textOnGold,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  buttonGhostText: {
    color: colours.textPrimary,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  biometricRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  back: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backText: {
    color: colours.textSecondary,
    fontSize: fontSizes.sm,
  },
});
