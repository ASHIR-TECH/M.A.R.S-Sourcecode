import React from 'react';
import { View, Text, Linking, Platform } from 'react-native';
import { AppBackground } from '../../components/AppBackground';
import { MarsLogo } from '../../components/icons/MarsLogo';
import { OAuthButton } from '../../components/buttons/OAuthButton';
import { useAuthStore } from '../../store/useAuthStore';
import { styles } from './SignInScreen.styles';

const TERMS_URL = 'https://example.com/terms';
const PRIVACY_URL = 'https://example.com/privacy';

export function SignInScreen() {
  const { status, error, signInWithGoogle, signInWithApple } = useAuthStore();
  const isLoading = status === 'loading';

  return (
    <AppBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <MarsLogo size={72} />
          <Text style={styles.title}>SIGN IN</Text>
          <Text style={styles.subtitle}>
            Choose your preferred method to access the station
          </Text>
        </View>

        <View style={styles.actions}>
          <OAuthButton
            label="Continue with Google"
            icon={<GoogleIcon />}
            onPress={signInWithGoogle}
            loading={isLoading}
          />

          <OAuthButton
            label="Continue with Apple"
            icon={<AppleIcon />}
            onPress={signInWithApple}
            loading={isLoading}
            disabled={Platform.OS !== 'ios'}
          />

          {error && (
            <Text style={styles.errorText} accessibilityRole="alert">
              {error}
            </Text>
          )}
        </View>

        <Text style={styles.footer}>
          By continuing, you agree to our{' '}
          <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>
            Terms
          </Text>{' '}
          &{' '}
          <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>
            Privacy Policy
          </Text>
        </Text>
      </View>
    </AppBackground>
  );
}

// Placeholder icon components — swap for the real brand SVGs/icon set.
function GoogleIcon() {
  return null;
}
function AppleIcon() {
  return null;
}
