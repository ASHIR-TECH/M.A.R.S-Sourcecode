import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { GoogleIcon } from '../icons/GoogleIcon';
import { signInButton } from '../../theme/signInButtons';

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
          color={LABEL_COLOR}
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
 * Uniform scale factor, 1.3.
 *
 * Google will not let the G be resized on its own: only sizes from the
 * official download bundle are permitted, and scaling is allowed solely so the
 * logo is never stretched. That means the logo, the label, the padding and the
 * button height are all locked to the same ratio -- a bigger G necessarily
 * means a taller button, and therefore a taller GitHub and Apple button too.
 *
 * At 1.3 the button is 62 tall with a 26px G, against 48/20 at the reference
 * size. signInButton.height must be kept equal to SPEC.height * SCALE, or the
 * three buttons stop lining up; the geometry test asserts exactly that.
 *
 * Change this single number to resize the button. Do not hand-edit the derived
 * values -- that is how a G ends up stretched or a label ends up off-centre.
 */
const SCALE = 1.3;

const metrics = {
  logo: Math.round(SPEC.logo * SCALE),
  paddingLeft: Math.round(SPEC.paddingLeft * SCALE),
  paddingRight: Math.round(SPEC.paddingRight * SCALE),
  /** Shared with GitHub, and still the scaled spec value (10 * 1.125 = 11). */
  gap: Math.round(SPEC.paddingAfterLogo * SCALE),
};

/**
 * Width, height, radius, font and colours are shared with the GitHub and Apple
 * buttons via signInButton, so all three form one column. Only the values
 * above are Google-specific, because only those are fixed by Google's spec.
 */
/**
 * Deliberate deviation from Google's published Dark theme, which specifies
 * #E3E3E3 for the label.
 *
 * Pure white was requested for legibility. Note the tradeoff honestly: the
 * spec value already measures 14.47:1 against the #131314 fill, which is far
 * past WCAG AA, so this is purely aesthetic rather than an accessibility fix.
 * It is also the one change here that is a genuine spec deviation rather than a
 * permitted scale, so it is isolated to a single constant and easy to revert if
 * you would rather stay exactly on spec.
 */
const LABEL_COLOR = '#FFFFFF';

const styles = StyleSheet.create({
  button: {
    // Google's reference asset is content-sized; this app fixes the width so
    // the three sign-in options align. Spec padding is still applied as the
    // content inset, so the logo never sits flush against the edge.
    width: signInButton.width,
    height: signInButton.height,
    borderRadius: signInButton.borderRadius,
    backgroundColor: signInButton.fill,
    borderWidth: signInButton.borderWidth,
    borderColor: signInButton.stroke,
    paddingLeft: metrics.paddingLeft,
    paddingRight: metrics.paddingRight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: signInButton.pressedOpacity },
  buttonDisabled: { opacity: signInButton.disabledOpacity },
  logoWrap: {
    width: metrics.logo,
    height: metrics.logo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginLeft: metrics.gap,
    fontSize: signInButton.fontSize,
    lineHeight: signInButton.lineHeight,
    // Semibold rather than Google's specified Medium, for the same legibility
    // reason as the colour above.
    fontWeight: '600',
    color: LABEL_COLOR,
  },
  spinner: { marginLeft: metrics.gap },
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