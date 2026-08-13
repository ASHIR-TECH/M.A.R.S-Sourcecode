import React from 'react';
import { render } from '@testing-library/react-native';
import { SignIn } from '@/components/SignIn';
import { brandColours } from '@/constants/brand';

describe('SignIn', () => {
  it('renders on the splash cream background', () => {
    const { getByTestId } = render(<SignIn />);
    expect(getByTestId('sign-in-screen').props.style).toEqual(
      expect.objectContaining({ backgroundColor: brandColours.cream })
    );
  });

  it('shows Google and Apple buttons only', () => {
    const { getByText, queryByText } = render(<SignIn />);
    expect(getByText('Sign in with Google')).toBeTruthy();
    expect(getByText('Sign in with Apple')).toBeTruthy();
    expect(queryByText('Sign in')).toBeNull();
    expect(queryByText('Email')).toBeNull();
  });
});
