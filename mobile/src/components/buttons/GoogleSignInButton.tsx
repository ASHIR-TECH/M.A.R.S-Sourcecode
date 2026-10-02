import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { GoogleIcon } from '../icons/GoogleIcon';

/**
 * Google's "Sign in with Google" button, per the Sign in with Google branding
 * guidelines: a white background, a 1px neutral border, and the official
 * multi-colour G at its unmodified brand colours.
 *
 * The guidelines are mandatory for app verification, and the current custom
 * dark-glass button ("Continue with Google" on a dark gradient) violates them
 * on background, border and call-to-action text. Google also reserves the
 * wording — "Sign in with Google" / "Sign up with Google" — so this component
 * fixes the label too.
 *
 * Note: Google requires the button to be at least as prominent as other
 * third-party sign-in options, so keep this and the GitHub button the same
 * size. Do not shrink or hide it behind a menu.
 */
interface GoogleSignInButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function GoogleSignInButton({ onPress, disabled, loading = false }: GoogleSignInButtonProps) {
  const isDisabled = Boolean(disabled) || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel="Sign in with Google"
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        isDisabled && styles.buttonDisabled,
      ]}
    >
      <View style={styles.logoWrap} pointerEvents="none">
        <GoogleIcon size={20} />
      </View>
      {/* The label stays put while loading. Swapping it for a bare spinner
          would drop the required call-to-action text mid-interaction. */}
      <Text style={styles.label} pointerEvents="none">
        Sign in with Google
      </Text>
      {loading && (
        <ActivityIndicator
          size="small"
          color="#1F1F1F"
          style={styles.spinner}
          pointerEvents="none"
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    // Official asset geometry: white fill, subtle neutral border, 4px radius.
    backgroundColor: '#FFFFFF',
    height: 48,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#747775',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { backgroundColor: '#F1F3F4' },
  buttonDisabled: { opacity: 0.5 },
  logoWrap: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  // Google specifies the label in the brand-neutral "Google Sans"/Roboto
  // weight, coloured #1F1F1F. Never restyle the text colour to inherit the
  // surrounding dark theme -- the button background stays white.
  label: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '500',
    color: '#1F1F1F',
  },
  spinner: { marginLeft: 10 },
});

/**
 * Reference for the approved asset, if you ever need to swap in the official
 * "Sign in with Google" PNG/SVG rather than the vector G above.
 *
 * Download: https://developers.google.com/identity/gsi/web/guides/download-assets
 *
 * The guidelines require the logo to keep its aspect ratio, appear on white,
 * and never be recoloured or resized to a non-standard size. The artwork is
 * the official "G" wordmark, not a bare circle, and must not be shown without
 * the button boundary and the sign-in text.
 */
export const GOOGLE_BRANDING_REFERENCE = {
  guidelines: 'https://developers.google.com/identity/branding-guidelines',
  assets: 'https://developers.google.com/identity/gsi/web/guides/download-assets',
  allowedLabels: ['sign_in_with', 'sign_up_with', 'continue_with'] as const,
} as const;
