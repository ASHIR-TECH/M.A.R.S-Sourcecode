import React from 'react';
import { render } from '@testing-library/react-native';
import IndexScreen from '@/app/index';
import { brandColours } from '@/constants/brand';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn() }),
}));

describe('IndexScreen (splash)', () => {
  it('renders the splash on the cream background', () => {
    const { getByTestId } = render(<IndexScreen />);
    expect(getByTestId('splash-screen').props.style).toEqual(
      expect.objectContaining({ backgroundColor: brandColours.cream })
    );
  });
});
