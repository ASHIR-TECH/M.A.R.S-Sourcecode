import { Dimensions } from 'react-native';

/**
 * Shared geometry and palette for every sign-in button on the auth screen.
 *
 * These live here rather than in each button's own stylesheet because three
 * separate definitions of "how wide is a sign-in button" is exactly how they
 * ended up at three different widths in the first place. Change a value once
 * and Google, GitHub and Apple all follow.
 */

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const signInButton = {
  /**
   * Responsive rather than a fixed 320.
   *
   * At a fixed 320 the column sat within 20dp of the screen edge on a 360dp
   * phone, and would have touched both edges on a 320dp device. Deriving it
   * from the screen means it grows on larger phones instead, which is what
   * "make the buttons longer" should actually mean.
   *
   * 32dp of total margin, capped at 420 so it does not become a full-width
   * slab on a tablet. Raise the cap or the margin to go wider or narrower --
   * it is the only number involved.
   */
  width: Math.min(SCREEN_WIDTH - 32, 420),

  /**
   * 62 = Google's 48px reference height scaled by SCALE 1.3.
   *
   * This must stay equal to SPEC.height * SCALE in GoogleSignInButton. Google
   * only permits the logo to be scaled proportionally, so the Google button's
   * height is not a free choice -- and if this drifts, the Google button ends
   * up a different height from the other two. A test asserts they agree.
   */
  height: 62,
  borderRadius: 12,

  /** Shared by Google and GitHub so the two labels sit identically. */
  fontSize: 18,
  lineHeight: 26,
  fontWeight: '600',
  /** Google spec: 10px between the logo and the label, scaled by 1.3. */
  gap: 13,

  /**
   * Google's official Dark theme, reused for GitHub.
   *
   * Dark rather than Light because the auth screen background is
   * #0B0704 -> #1A0F08. A white button reads as a foreign control on top of
   * that.
   *
   * For GitHub this is also closer to its own branding than what it replaced:
   * the previous button was an orange glass tint with a cream label and a
   * gloss highlight, none of which is GitHub's. GitHub's own sign-in button
   * is dark, so matching here is both more consistent and more accurate.
   */
  fill: '#131314',
  stroke: '#8E918F',
  /**
   * Pure white, 18.57:1 against the fill.
   *
   * GoogleSignInButton overrides this with its own LABEL_COLOR constant so the
   * spec-vs-brightness decision lives in one place on that side. Both resolve
   * to #FFFFFF today; they are separate constants only because Google's value
   * is spec-governed and GitHub's is not.
   */
  text: '#FFFFFF',

  borderWidth: 1,
  /** Opacity-based, so press feedback cannot drift from the palette. */
  pressedOpacity: 0.85,
  disabledOpacity: 0.5,
} as const;