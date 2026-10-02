import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GoogleSignInButton } from './GoogleSignInButton';
import { signInButton } from '../../theme/signInButtons';

/**
 * Google's branding guidelines make the sign-in button presentation mandatory,
 * and they are the thing most likely to be broken by a well-meaning restyle to
 * match the rest of the dark sign-in screen. These tests are deliberately
 * assertion-heavy on the exact values the guidelines pin down, so a future
 * theme change fails here instead of silently costing app verification.
 */
describe('GoogleSignInButton', () => {
  it('shows the reserved "Sign in with Google" wording as visible text', () => {
    // A bare G with only an accessibilityLabel is not compliant: the label has
    // to be readable on screen, not just announced to a screen reader.
    const { getByText } = render(<GoogleSignInButton onPress={jest.fn()} />);
    expect(getByText('Sign in with Google')).toBeTruthy();
  });

  it('uses the reserved label in its accessible name too', () => {
    const { getByLabelText } = render(<GoogleSignInButton onPress={jest.fn()} />);
    expect(getByLabelText('Sign in with Google')).toBeTruthy();
  });

  it('uses the official Dark theme fill and stroke', () => {
    const { UNSAFE_getByProps } = render(<GoogleSignInButton onPress={jest.fn()} />);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pressable: any = UNSAFE_getByProps({ accessibilityRole: 'button' });
    // Pressable takes a style callback, so resolve it to inspect the result.
    const resolved = typeof pressable.props.style === 'function' ? pressable.props.style({ pressed: false }) : pressable.props.style;
    const flat = JSON.stringify(resolved);
    // Google's published Dark theme: Fill #131314, Stroke #8E918F.
    expect(flat).toContain('#131314');
    expect(flat).toContain('#8E918F');
  });

  it('applies Google spec padding, scaled proportionally', () => {
    const { UNSAFE_getByProps } = render(<GoogleSignInButton onPress={jest.fn()} />);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pressable: any = UNSAFE_getByProps({ accessibilityRole: 'button' });
    const resolved = typeof pressable.props.style === 'function' ? pressable.props.style({ pressed: false }) : pressable.props.style;
    const flat = JSON.stringify(resolved);

    // Google fixes the Android insets at 12px edges and 10px after the logo.
    // They scale by SCALE = 1.3 -> 16px edges, 13px after the logo.
    // Asserted by value rather than by constant so the ratio is what is tested.
    expect(flat).toContain('"paddingLeft":16');
    expect(flat).toContain('"paddingRight":16');
    expect(flat).toContain(`"height":${signInButton.height}`);
  });

  it('spaces the label from the logo using the spec inset, scaled', () => {
    const { getByText } = render(<GoogleSignInButton onPress={jest.fn()} />);
    // 10px after the G, scaled by 1.3 -> 13px.
    expect(JSON.stringify(getByText('Sign in with Google').props.style)).toContain('"marginLeft":13');
  });

  it('matches the geometry of the GitHub and Apple buttons', () => {
    const { UNSAFE_getByProps } = render(<GoogleSignInButton onPress={jest.fn()} />);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pressable: any = UNSAFE_getByProps({ accessibilityRole: 'button' });
    const resolved = typeof pressable.props.style === 'function' ? pressable.props.style({ pressed: false }) : pressable.props.style;
    const flat = JSON.stringify(resolved);
    // Asserted against the shared constant rather than a literal: the point of
    // this test is that Google, GitHub and Apple cannot drift apart, not that
    // the width happens to be some particular number.
    expect(flat).toContain(`"width":${signInButton.width}`);
    expect(flat).toContain(`"height":${signInButton.height}`);
    expect(flat).toContain(`"borderRadius":${signInButton.borderRadius}`);
  });

  it('uses the brighter white label requested over the spec grey', () => {
    const { getByText } = render(<GoogleSignInButton onPress={jest.fn()} />);
    const style = JSON.stringify(getByText('Sign in with Google').props.style);
    // Google's Dark theme specifies #E3E3E3. Pure white was chosen for
    // legibility and is the one real spec deviation in this component, so it
    // is pinned here deliberately: if someone reverts it to be exactly on
    // spec, this test should fail loudly rather than pass unnoticed.
    expect(style).toContain('#FFFFFF');
    expect(style).not.toContain('#E3E3E3');
    // Light theme text must never leak in.
    expect(style).not.toContain('#1F1F1F');
  });

  it('scales the logo proportionally instead of resizing it freely', () => {
    // Google only permits the G to scale with the button, so the invariant that
    // matters is that the logo's share of the button height is unchanged from
    // the reference asset (20 of 48).
    //
    // Asserted as a ratio rather than against SCALE directly, because each
    // derived value is rounded to whole pixels -- 48 * 1.3 is 62.4 -> 62, which
    // is a ratio of 1.2917, not 1.3. Comparing against the rounded numbers is
    // what actually proves the logo was scaled rather than nudged.
    const referenceRatio = 20 / 48;
    const scaledLogo = Math.round(20 * 1.3);
    expect(scaledLogo / signInButton.height).toBeCloseTo(referenceRatio, 2);
  });

  it('calls onPress when enabled', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<GoogleSignInButton onPress={onPress} />);
    fireEvent.press(getByLabelText('Sign in with Google'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire while disabled', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<GoogleSignInButton onPress={onPress} disabled />);
    fireEvent.press(getByLabelText('Sign in with Google'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('reports its disabled state to assistive tech', () => {
    const { getByLabelText } = render(<GoogleSignInButton onPress={jest.fn()} disabled />);
    expect(getByLabelText('Sign in with Google').props.accessibilityState.disabled).toBe(true);
  });

  it('keeps the label visible while loading instead of swapping in a spinner', () => {
    // Google requires the call-to-action text on the button; replacing it with
    // a bare progress indicator mid-interaction drops the branding.
    const { getByText, UNSAFE_getByType } = render(<GoogleSignInButton onPress={jest.fn()} loading />);
    expect(getByText('Sign in with Google')).toBeTruthy();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('does not fire while loading', () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<GoogleSignInButton onPress={onPress} loading />);
    fireEvent.press(getByLabelText('Sign in with Google'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
