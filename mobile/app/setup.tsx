import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { GoogleIcon, AppleIcon } from '@/components/AuthIcons';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleAuth, signInWithApple, completeAuth } from '@/lib/auth';
import { setApiUrl } from '@/lib/storage';
import { healthCheck } from '@/api/client';
import { colors, FONTS } from '@/constants/brand';

const BUTTON_HEIGHT = 56;
const ENTRANCE_MS = 500;
const STAGGER_MS = 120;

type Step = 'url' | 'signin';

export default function SetupScreen() {
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const [step, setStep] = useState<Step>('url');
  const [apiUrl, setApiUrlState] = useState('http://');
  const [urlError, setUrlError] = useState('');
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    const url = apiUrl.trim();
    if (!url || url === 'http://') {
      setUrlError('Enter your desktop API URL');
      return;
    }

    setConnecting(true);
    setUrlError('');
    await setApiUrl(url);

    const { error } = await healthCheck();
    setConnecting(false);

    if (error) {
      setUrlError('Cannot reach desktop. Check the URL and try again.');
      return;
    }

    setStep('signin');
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <BrandLogo width={80} color={colors.text} />
          <View style={styles.titleGroup}>
            {step === 'url' ? (
              <>
                <Text style={styles.title}>
                  CONNECT <Text style={styles.titleAccent}>DESKTOP</Text>
                </Text>
                <Text style={styles.subtitle}>
                  Enter your desktop peer's REST API URL to get started
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.title}>
                  SIGN <Text style={styles.titleAccent}>IN</Text>
                </Text>
                <Text style={styles.subtitle}>
                  Choose your preferred method to access the station
                </Text>
              </>
            )}
          </View>
        </View>

        {step === 'url' ? (
          <UrlStep
            apiUrl={apiUrl}
            setApiUrl={setApiUrlState}
            error={urlError}
            connecting={connecting}
            onConnect={handleConnect}
          />
        ) : (
          <SignInStep
            apiUrl={apiUrl}
            onSignedIn={async () => {
              await refreshAuth();
              router.replace({ pathname: '/(tabs)' } as any);
            }}
          />
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

function UrlStep({
  apiUrl,
  setApiUrl,
  error,
  connecting,
  onConnect,
}: {
  apiUrl: string;
  setApiUrl: (v: string) => void;
  error: string;
  connecting: boolean;
  onConnect: () => void;
}) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withDelay(200, withTiming(1, { duration: ENTRANCE_MS, easing: Easing.out(Easing.cubic) }));
  }, [progress]);

  const anim = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 24 }],
  }));

  return (
    <Animated.View style={[styles.content, anim]}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>API URL</Text>
        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          value={apiUrl}
          onChangeText={setApiUrl}
          placeholder="http://192.168.1.100:40003"
          placeholderTextColor={colors.text + '40'}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!connecting}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, connecting && styles.primaryBtnDisabled]}
        onPress={onConnect}
        disabled={connecting}
      >
        <Text style={styles.primaryBtnText}>
          {connecting ? 'CONNECTING...' : 'CONNECT'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.hint}>
        Make sure the MARS REST API is running on your desktop peer
      </Text>
    </Animated.View>
  );
}

function SignInStep({
  apiUrl,
  onSignedIn,
}: {
  apiUrl: string;
  onSignedIn: () => void;
}) {
  const { request, response, promptAsync } = useGoogleAuth();
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (response?.type === 'success' && response.authentication?.idToken) {
      setLoading('google');
      completeAuth('google', response.authentication.idToken, '', '', apiUrl)
        .then(() => onSignedIn())
        .catch((e) => {
          setError(String(e));
          setLoading(null);
        });
    }
  }, [response, apiUrl, onSignedIn]);

  const handleGoogle = async () => {
    setError('');
    try {
      await promptAsync();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleApple = async () => {
    setError('');
    setLoading('apple');
    try {
      const result = await signInWithApple();
      await completeAuth('apple', result.idToken, result.displayName, result.email, apiUrl);
      onSignedIn();
    } catch (e) {
      setError(String(e));
      setLoading(null);
    }
  };

  return (
    <View style={styles.content}>
      <View style={styles.buttons}>
        <AnimatedButton delay={0}>
          <Pressable
            onPress={handleGoogle}
            disabled={loading !== null}
            style={({ pressed }) => [
              styles.authButton,
              pressed && styles.buttonPressed,
              loading !== null && styles.authButtonDisabled,
            ]}
          >
            <GoogleIcon size={22} />
            <Text style={styles.authLabel}>
              {loading === 'google' ? 'CONNECTING...' : 'Continue with Google'}
            </Text>
          </Pressable>
        </AnimatedButton>

        <AnimatedButton delay={STAGGER_MS}>
          <Pressable
            onPress={handleApple}
            disabled={loading !== null}
            style={({ pressed }) => [
              styles.authButton,
              pressed && styles.buttonPressed,
              loading !== null && styles.authButtonDisabled,
            ]}
          >
            <AppleIcon size={20} />
            <Text style={styles.authLabel}>
              {loading === 'apple' ? 'CONNECTING...' : 'Continue with Apple'}
            </Text>
          </Pressable>
        </AnimatedButton>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Text style={styles.terms}>
        By continuing, you agree to our{' '}
        <Text style={styles.termsLink}>Terms</Text> &{' '}
        <Text style={styles.termsLink}>Privacy Policy</Text>
      </Text>
    </View>
  );
}

function AnimatedButton({ delay, children }: { delay: number; children: React.ReactNode }) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: ENTRANCE_MS, easing: Easing.out(Easing.cubic) })
    );
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 24 }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flex: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 92,
    paddingBottom: 37,
  },
  header: {
    alignItems: 'center',
    gap: 24,
  },
  titleGroup: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: FONTS.audiowide,
    fontSize: 28,
    color: colors.text,
  },
  titleAccent: {
    color: colors.accent,
  },
  subtitle: {
    fontFamily: FONTS.geist,
    fontSize: 14,
    color: colors.text,
    opacity: 0.55,
    textAlign: 'center',
    lineHeight: 18.2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontFamily: FONTS.quanticoBold,
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    opacity: 0.5,
    letterSpacing: 1,
  },
  input: {
    height: BUTTON_HEIGHT,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    fontFamily: FONTS.jetbrains,
    fontSize: 14,
    color: colors.text,
  },
  inputError: {
    borderColor: '#e85d4a',
  },
  errorText: {
    fontFamily: FONTS.geist,
    fontSize: 12,
    color: '#e85d4a',
    marginTop: 4,
  },
  primaryBtn: {
    height: BUTTON_HEIGHT,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    fontFamily: FONTS.quanticoBold,
    fontSize: 15,
    fontWeight: '700',
    color: colors.bg,
    letterSpacing: 1,
  },
  hint: {
    fontFamily: FONTS.geist,
    fontSize: 12,
    color: colors.text,
    opacity: 0.35,
    textAlign: 'center',
  },
  buttons: {
    gap: 14,
  },
  authButton: {
    height: BUTTON_HEIGHT,
    borderRadius: 50,
    backgroundColor: 'rgba(240, 237, 228, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(240, 237, 228, 0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  authButtonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  authLabel: {
    fontFamily: FONTS.quanticoBold,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  terms: {
    fontFamily: FONTS.geist,
    fontSize: 12,
    color: colors.text,
    opacity: 0.45,
    textAlign: 'center',
    lineHeight: 15.6,
  },
  termsLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
