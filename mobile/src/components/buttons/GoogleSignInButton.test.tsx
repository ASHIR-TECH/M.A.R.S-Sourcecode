import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GoogleSignInButton } from './GoogleSignInButton';

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

  it('keeps the white background and neutral border Google specifies', () => {
    const { UNSAFE_getByProps } = render(<GoogleSignInButton onPress={jest.fn()} />);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pressable: any = UNSAFE_getByProps({ accessibilityRole: 'button' });
    // Pressable takes a style callback, so resolve it to inspect the result.
    const resolved = typeof pressable.props.style === 'function' ? pressable.props.style({ pressed: false }) : pressable.props.style;
    const flat = JSON.stringify(resolved);
    expect(flat).toContain('#FFFFFF');
    expect(flat).toContain('#747775');
  });

  it('keeps the label in the brand-neutral dark grey, not theme text colour', () => {
    const { getByText } = render(<GoogleSignInButton onPress={jest.fn()} />);
    expect(JSON.stringify(getByText('Sign in with Google').props.style)).toContain('#1F1F1F');
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
