import React from 'react';
import { View, Text, Linking, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { AppBackground } from '../../components/AppBackground';
import { GitHubIcon } from '../../components/icons/GitHubIcon';
import { OAuthButton } from '../../components/buttons/OAuthButton';
import { GoogleSignInButton } from '../../components/buttons/GoogleSignInButton';
import { useAuthStore } from '../../store/useAuthStore';
import { styles } from './SignInScreen.styles';

// Google's OAuth consent screen requires real, publicly reachable Terms and
// Privacy Policy URLs on a verified domain. Point these at your own domain --
// leaving the example.com placeholders here is a verification blocker, not a
// cosmetic issue.
const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL ?? 'https://example.com/terms';
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL ?? 'https://example.com/privacy';

export function SignInScreen() {
  const { status, error, loadingProvider, signInWithGoogle, signInWithGithub, signInWithApple } = useAuthStore();
  const isLoading = status === 'loading';

  return (
    <AppBackground>
      <View style={styles.container}>
        <View style={styles.centerBlock}>
          <Text style={styles.title}>WELCOME</Text>

          <Text style={styles.subtitle}>
            First time experiencing a one Entry System?{'\n'}
            We are not a Big Data company, we don't need to send you spam. we value your happiness.{'\n'}
            - Mr Potato Head [CEO]
          </Text>

          <View style={styles.actions}>
            {/* Official Google-branded button: white background, brand G,
                reserved "Sign in with Google" wording. Required for brand
                verification — do not restyle this to match the others. */}
            <GoogleSignInButton
              onPress={signInWithGoogle}
              disabled={isLoading}
              loading={loadingProvider === 'google'}
            />

            <OAuthButton
            label="Continue with GitHub"
            icon={<GitHubIcon size={26} />}
            iconPosition="end"
            onPress={signInWithGithub}
            loading={loadingProvider === 'github'}
            />

            {Platform.OS === 'ios' && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={10}
                onPress={isLoading ? () => {} : signInWithApple}
                style={styles.appleButton}
              />
            )}

            {error && (
              <Text style={styles.errorText} accessibilityRole="alert">
                {error}
              </Text>
            )}
          </View>
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
