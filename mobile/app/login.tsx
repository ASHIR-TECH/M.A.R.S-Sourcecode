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
import { GradientText } from '@/components/GradientText';
import { AppleAuthenticationButton, AppleAuthenticationButtonStyle, AppleAuthenticationButtonType } from 'expo-apple-authentication';
import { colours, fontSizes, radii, spacing, touchTarget } from '@/constants/colours';
import { useAuth } from '@/contexts/AuthContext';
import { useOAuth } from '@/hooks/useOAuth';

const VERSION = '1.0.0';

export default function LoginScreen() {
  const { isAuthenticated, apiUrl, saveApiUrl, connecting } = useAuth();
  const { busy, error, beginGoogle, beginApple } = useOAuth();

  const [showUrlInput, setShowUrlInput] = useState(!apiUrl);
  const [url, setUrl] = useState(apiUrl ?? '');
  const [savingUrl, setSavingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/chat" />;
  }

  const working = busy || connecting || savingUrl;

  const saveUrl = async () => {
    setSavingUrl(true);
    setUrlError(null);
    try {
      await saveApiUrl(url);
      setShowUrlInput(false);
    } catch (e) {
      setUrlError(e instanceof Error ? e.message : 'Cannot reach that URL.');
    } finally {
      setSavingUrl(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.brand}>
          <GradientText style={styles.wordmark}>MARS</GradientText>
          <Text style={styles.subtitle}>Mobile Agent Remote System</Text>
        </View>

        <View style={styles.actions}>
          {showUrlInput ? (
            <View style={styles.urlBlock}>
              <Text style={styles.urlLabel}>Desktop API URL</Text>
              <TextInput
                style={styles.urlInput}
                value={url}
                onChangeText={setUrl}
                placeholder="https://your-desktop:40003"
                placeholderTextColor={colours.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!working}
                testID="desktop-url-input"
              />
              {urlError ? <Text style={styles.error}>{urlError}</Text> : null}
              <Pressable
                onPress={saveUrl}
                disabled={!url.trim() || working}
                style={({ pressed }) => [
                  styles.saveUrlButton,
                  (!url.trim() || working) && styles.disabled,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Save desktop API URL"
              >
                {savingUrl ? (
                  <ActivityIndicator color={colours.gold} />
                ) : (
                  <Text style={styles.saveUrlText}>Save &amp; continue</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <>
              <Pressable
                onPress={beginGoogle}
                disabled={working}
                style={({ pressed }) => [
                  styles.oauthButton,
                  styles.googleButton,
                  working && styles.disabled,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Sign in with Google"
              >
                <View style={styles.googleLogo}>
                  <Ionicons name="logo-google" size={20} color={colours.black} />
                </View>
                <Text style={styles.googleText}>
                  {busy ? 'Signing in…' : 'Sign in with Google'}
                </Text>
                {busy ? <ActivityIndicator color={colours.black} size="small" /> : null}
              </Pressable>

              {Platform.OS === 'ios' ? (
                <AppleAuthenticationButton
                  buttonType={AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={8}
                  style={styles.appleButton}
                  onPress={() => void beginApple()}
                />
              ) : null}
            </>
          )}

          {error ? (
            <View style={styles.toast}>
              <Ionicons name="alert-circle" size={16} color={colours.white} />
              <Text style={styles.toastText}>{error}</Text>
            </View>
          ) : null}

          {!showUrlInput ? (
            <Pressable
              onPress={() => {
                setShowUrlInput(true);
                setUrl(apiUrl ?? '');
              }}
              style={styles.urlLink}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={styles.urlLinkText}>Change desktop API URL</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.footer}>MARS v{VERSION}</Text>
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
    paddingHorizontal: 32,
  },
  brand: {
    position: 'absolute',
    top: '38%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  wordmark: {
    fontSize: 48,
    fontFamily: 'Audiowide',
    letterSpacing: 6,
  },
  subtitle: {
    color: colours.purpleBright,
    fontSize: 13,
    fontFamily: 'Offside',
    marginTop: 8,
  },
  actions: {
    position: 'absolute',
    top: '62%',
    left: 0,
    right: 0,
    paddingHorizontal: 32,
    gap: 12,
  },
  oauthButton: {
    height: 52,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  googleButton: {
    backgroundColor: colours.white,
  },
  appleButton: {
    height: 52,
    alignSelf: 'stretch',
  },
  googleLogo: {
    width: 20,
    alignItems: 'center',
  },
  googleText: {
    color: colours.black,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Offside',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  urlBlock: {
    gap: 10,
  },
  urlLabel: {
    color: colours.textSecondary,
    fontSize: 13,
    fontFamily: 'Offside',
  },
  urlInput: {
    backgroundColor: colours.bgOverlay,
    borderWidth: 1,
    borderColor: colours.purpleDim,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colours.textPrimary,
    fontSize: 14,
    minHeight: touchTarget,
    fontFamily: 'Offside',
  },
  saveUrlButton: {
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colours.bgSurface,
    borderWidth: 1,
    borderColor: colours.gold,
  },
  saveUrlText: {
    color: colours.gold,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Offside',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colours.ember,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  toastText: {
    color: colours.white,
    fontSize: 13,
    fontFamily: 'Offside',
    flex: 1,
  },
  error: {
    color: colours.ember,
    fontSize: 13,
    fontFamily: 'Offside',
  },
  urlLink: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  urlLinkText: {
    color: colours.purpleBright,
    fontSize: 12,
    fontFamily: 'Offside',
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: colours.textMuted,
    fontSize: 11,
    fontFamily: 'Offside',
  },
});
