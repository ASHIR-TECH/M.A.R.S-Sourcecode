import React from 'react';
import { render } from '@testing-library/react-native';
import { SignIn } from '@/components/SignIn';

describe('SignIn', () => {
  it('renders on the matching cream gradient', () => {
    const { getByTestId } = render(<SignIn />);
    expect(getByTestId('sign-in-screen').props.colors).toEqual([
      0xfff5f3f1,
      0xfff1f0ea,
      0xffeceae1,
    ]);
  });

  it('shows Google and Apple buttons only', () => {
    const { getByText, queryByText } = render(<SignIn />);
    expect(getByText('Sign in with Google')).toBeTruthy();
    expect(getByText('Sign in with Apple')).toBeTruthy();
    expect(queryByText('Sign in')).toBeNull();
    expect(queryByText('Email')).toBeNull();
  });
});
