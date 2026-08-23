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
/* Line 21 is how you rotate the svg  */
  /* This is where you change the mars SVG. kinda sucks that i dont know how to write a comment in a .tsx file. well python does thst to your head*/
  return (
    <AppBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <MarsLogo size={130} style={{ transform: [{ scaleX: -1 }] }} />
          <Text style={styles.title}>WELCOME</Text>
          <Text style={styles.subtitle}>
            First time experiencing a one Entry System?{'\n'}
            We are not a Big Data company, we don't need to send you spam. we value your happiness.{'\n'}
            - Mr Potato Head [CEO]
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
