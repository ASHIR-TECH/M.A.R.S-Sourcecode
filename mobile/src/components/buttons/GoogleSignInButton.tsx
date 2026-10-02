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
 * Size and padding
 * ----------------
 * Google's guidelines fix the internal padding rather than leaving it free:
 *
 *   Android & Web   12px before the G, 10px after the G, 12px after the text
 *   iOS             16px before the G, 12px after the G, 16px after the text
 *
 * Overall size, by contrast, is explicitly open: "You can scale the button as
 * needed for different devices and screen sizes, but you must preserve the
 * aspect ratio so that the Google logo is not stretched."
 *
 * So SPEC below holds Google's exact Android metrics and SCALE multiplies all
 * of them together. Resizing the button means changing SCALE and nothing
 * else, which is what keeps the G from being stretched or the label from
 * drifting out of position.
 *
 * One deliberate deviation: borderRadius 10 instead of the reference asset's
 * 4px, to match OAuthButton and the Apple button. Google publishes rectangular
 * and pill shapes and enforces no specific corner radius.
 *
 * Non-negotiable, per the guidelines: the G is never recoloured, never
 * distorted, never used without the button boundary and the sign-in text, the
 * wording stays one of the three reserved strings, and the button must be at
 * least as prominent as other third-party options.
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
        <GoogleIcon size={metrics.logo} />
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

/**
 * Google's published Android reference metrics for this button. Every value
 * below is multiplied by SCALE, so the button can be resized for a given
 * screen without the G ever being stretched independently of it -- which is
 * the one size rule Google actually enforces.
 */
const SPEC = {
  height: 48,
  logo: 20,
  fontSize: 14,
  lineHeight: 20,
  paddingLeft: 12,
  paddingAfterLogo: 10,
  paddingRight: 12,
} as const;

/**
 * Uniform scale factor. 1.125 = 54 / 48, i.e. the reference height scaled up
 * to match this app's GitHub and Apple buttons.
 *
 * Change this single number to resize the whole button. Do not hand-edit the
 * derived values below -- that is how a G ends up stretched or a label ends up
 * off-centre, both of which Google flags during review.
 */
const SCALE = 1.125;

const metrics = {
  height: Math.round(SPEC.height * SCALE),
  logo: Math.round(SPEC.logo * SCALE),
  fontSize: Math.round(SPEC.fontSize * SCALE),
  lineHeight: Math.round(SPEC.lineHeight * SCALE),
  paddingLeft: Math.round(SPEC.paddingLeft * SCALE),
  paddingAfterLogo: Math.round(SPEC.paddingAfterLogo * SCALE),
  paddingRight: Math.round(SPEC.paddingRight * SCALE),
};

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
    //
    // The width is fixed by this app's layout; Google's reference asset is
    // content-sized. Spec padding is still applied as the content inset, so
    // the logo never sits flush against the edge.
    width: 320,
    height: metrics.height,
    borderRadius: 10,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.stroke,
    paddingLeft: metrics.paddingLeft,
    paddingRight: metrics.paddingRight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Press feedback is an opacity change rather than a fill change, so it
  // cannot drift away from the published Dark theme colours.
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.5 },
  logoWrap: {
    width: metrics.logo,
    height: metrics.logo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginLeft: metrics.paddingAfterLogo,
    fontSize: metrics.fontSize,
    lineHeight: metrics.lineHeight,
    fontWeight: '500',
    color: colors.text,
  },
  spinner: { marginLeft: metrics.paddingAfterLogo },
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