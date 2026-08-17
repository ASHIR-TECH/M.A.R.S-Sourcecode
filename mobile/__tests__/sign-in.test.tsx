import React from 'react';
import { render } from '@testing-library/react-native';
import { SignIn } from '@/components/SignIn';

describe('SignIn', () => {
  it('renders over the orb background (no cream gradient)', () => {
    const { getByTestId } = render(<SignIn />);
    const screen = getByTestId('sign-in-screen');
    expect(screen.props.colors).toBeUndefined();
    expect(screen.props.style).toEqual({ flex: 1, paddingHorizontal: 32 });
  });

  it('shows Google and Apple buttons only', () => {
    const { getAllByText, queryByText } = render(<SignIn />);
    expect(getAllByText('Sign in with Google').length).toBeGreaterThan(0);
    expect(getAllByText('Sign in with Apple').length).toBeGreaterThan(0);
    expect(queryByText('Sign in')).toBeNull();
    expect(queryByText('Email')).toBeNull();
  });
});
