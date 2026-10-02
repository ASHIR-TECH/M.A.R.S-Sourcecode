import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { GoogleIcon } from '../icons/GoogleIcon';

/**
 * Google's "Sign in with Google" button, per the Sign in with Google branding
 * guidelines.
 *
 * Colour mode
 * -----------
 * Google publishes three approved themes:
 *
 *   Light    Fill #FFFFFF  Stroke #747775 1px  Text #1F1F1F
 *   Dark     Fill #131314  Stroke #8E918F 1px  Text #E3E3E3
 *   Neutral  Fill #F2F2F2  no stroke            Text #1F1F1F
 *
 * We use Dark. This app has a dark gradient background with an orange glass
 * button treatment, so a white Light-theme button read as a foreign, generic
 * control sitting on top of the design rather than part of it. Dark is an
 * officially published theme, not a restyle, so this stays compliant.
 *
 * To switch back to Light, use those three values above and nothing else.
 *
 * Two deliberate deviations from the reference asset, both to match the rest
 * of this app. Flagged here so they are not mistaken for accidental:
 *   1. borderRadius 10 instead of the reference asset's 4px, to match
 *      OAuthButton and the Apple button. Google publishes rectangular and
 *      pill shapes and does not enforce a specific corner radius.
 *   2. fontSize 16 instead of the reference asset's 14, to keep the label
 *      legible against the neighbouring 18px "Continue with GitHub".
 *
 * Non-negotiable, per the guidelines: the G is never recoloured, never
 * distorted, never used without the button boundary and the sign-in text,
 * and the button must be at least as prominent as other third-party options.
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
      // Reports disabled while loading too, so assistive tech does not
      // advertise the button as actionable mid-sign-in.
      accessibilityState={{ disabled: isDisabled, busy: loading }}
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
          color={colors.text}
          style={styles.spinner}
          pointerEvents="none"
        />
      )}
    </Pressable>
  );
}

/** Google's official Dark theme values, plus the shared button geometry. */
const colors = {
  fill: '#131314',
  stroke: '#8E918F',
  text: '#E3E3E3',
};

const styles = StyleSheet.create({
  button: {
    // width/height/radius match OAuthButton and the Apple button so all
    // three sign-in options line up. Google requires the Google button be
    // at least as prominent as the others, not that it be identical.
    width: 320,
    height: 54,
    borderRadius: 10,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.stroke,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Press feedback is an opacity change rather than a fill change, so it
  // cannot drift away from the published Dark theme colours.
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.5 },
  logoWrap: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  label: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  spinner: { marginLeft: 12 },
});

/**
 * Reference for the approved assets, if you ever need to swap in the official
 * PNG/SVG rather than the vector G above.
 *
 * Download: https://developers.google.com/identity/gsi/web/guides/download-assets
 * Specs:    https://developers.google.com/identity/branding-guidelines
 *
 * The wording is reserved by Google: "Sign in with Google", "Sign up with
 * Google" or "Continue with Google". Nothing else is permitted.
 */
export const GOOGLE_BRANDING_REFERENCE = {
  guidelines: 'https://developers.google.com/identity/branding-guidelines',
  assets: 'https://developers.google.com/identity/gsi/web/guides/download-assets',
  allowedLabels: ['sign_in_with', 'sign_up_with', 'continue_with'] as const,
  themes: {
    light: { fill: '#FFFFFF', stroke: '#747775', text: '#1F1F1F' },
    dark: { fill: '#131314', stroke: '#8E918F', text: '#E3E3E3' },
    neutral: { fill: '#F2F2F2', stroke: null, text: '#1F1F1F' },
  },
} as const;