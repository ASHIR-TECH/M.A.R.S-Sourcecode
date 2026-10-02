import { StyleSheet } from 'react-native';
import { signInButton } from '../../theme/signInButtons';

/**
 * Shared sign-in button styling for the non-branded options (currently GitHub).
 *
 * This deliberately mirrors GoogleSignInButton rather than keeping a separate
 * treatment: it uses the same dark palette, the same 1px neutral stroke, the
 * same radius, the same height and the same label size, all sourced from
 * signInButton so the two cannot drift apart again.
 *
 * Two things were removed relative to the previous version:
 *
 *   - The orange glass tint and the topGloss highlight. Glass reads as a
 *     distinct component sitting next to a flat Google button, which was the
 *     inconsistency this replaces.
 *   - The drop shadow and Android elevation. Google's button has neither, and
 *     keeping them made the pair look like two different design systems.
 *
 * For GitHub this is also closer to its own branding than the orange glass
 * was: GitHub's sign-in button is dark with a light label, and the white
 * GitHub mark sits correctly on the dark fill.
 */
export const styles = StyleSheet.create({
  button: {
    width: signInButton.width,
    height: signInButton.height,
    borderRadius: signInButton.borderRadius,
    backgroundColor: signInButton.fill,
    borderWidth: signInButton.borderWidth,
    borderColor: signInButton.stroke,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonPressed: { opacity: signInButton.pressedOpacity },
  buttonDisabled: { opacity: signInButton.disabledOpacity },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: signInButton.gap,
  },
  label: {
    color: signInButton.text,
    fontWeight: '500',
    fontSize: signInButton.fontSize,
    lineHeight: signInButton.lineHeight,
  },
});