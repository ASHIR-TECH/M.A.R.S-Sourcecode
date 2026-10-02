import React from 'react';
import { render } from '@testing-library/react-native';
import { OAuthButton } from './OAuthButton';
import { signInButton } from '../../theme/signInButtons';

/**
 * The regression these tests exist for: Google, GitHub and Apple are three
 * separate components with three separate stylesheets, and nothing structurally
 * stopped them from drifting apart. They already had -- the GitHub button was
 * an orange glass pill roughly 400px wide sitting next to a 320px Apple button.
 *
 * So these assert against the shared signInButton constant rather than against
 * literal values. If one button is restyled without the others, it fails.
 */
function styleOf(button: React.ReactElement) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pressable: any = button;
  const resolved =
    typeof pressable.props.style === 'function'
      ? pressable.props.style({ pressed: false })
      : pressable.props.style;
  // The Pressable receives an array; flatten to a single object for comparison.
  return Object.assign({}, ...[resolved].flat().filter(Boolean));
}

describe('OAuthButton', () => {
  it('uses the shared dark palette, not a bespoke fill', () => {
    const { UNSAFE_getByProps } = render(<OAuthButton label="Continue with GitHub" onPress={jest.fn()} />);
    const s = styleOf(UNSAFE_getByProps({ accessibilityRole: 'button' }));
    expect(s.backgroundColor).toBe(signInButton.fill);
    expect(s.borderColor).toBe(signInButton.stroke);
    expect(s.borderWidth).toBe(signInButton.borderWidth);
  });

  it('shares the width, height and radius of every other sign-in option', () => {
    const { UNSAFE_getByProps } = render(<OAuthButton label="Continue with GitHub" onPress={jest.fn()} />);
    const s = styleOf(UNSAFE_getByProps({ accessibilityRole: 'button' }));
    expect(s.width).toBe(signInButton.width);
    expect(s.height).toBe(signInButton.height);
    expect(s.borderRadius).toBe(signInButton.borderRadius);
  });

  it('has no shadow or elevation, so it matches the flat Google button', () => {
    const { UNSAFE_getByProps } = render(<OAuthButton label="Continue with GitHub" onPress={jest.fn()} />);
    const s = styleOf(UNSAFE_getByProps({ accessibilityRole: 'button' }));
    expect(s.shadowColor).toBeUndefined();
    expect(s.shadowOpacity).toBeUndefined();
    expect(s.elevation).toBeUndefined();
  });

  it('uses the shared label size and colour', () => {
    const { getByText } = render(<OAuthButton label="Continue with GitHub" onPress={jest.fn()} />);
    const label = getByText('Continue with GitHub');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s: any = label.props.style;
    const flat = Object.assign({}, ...[s].flat().filter(Boolean));
    expect(flat.color).toBe(signInButton.text);
    expect(flat.fontSize).toBe(signInButton.fontSize);
    // The previous treatment used a bold cream label with a text shadow.
    expect(flat.textShadowColor).toBeUndefined();
  });

  it('reports disabled while loading so it cannot be double-submitted', () => {
    const { UNSAFE_getByProps } = render(<OAuthButton label="Continue with GitHub" onPress={jest.fn()} loading />);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = (UNSAFE_getByProps({ accessibilityRole: 'button' }) as any).props.accessibilityState;
    expect(state.disabled).toBe(true);
    expect(state.busy).toBe(true);
  });
});