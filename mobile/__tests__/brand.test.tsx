import React from 'react';
import { render } from '@testing-library/react-native';
import IndexScreen from '@/app/index';
import { brandColours } from '@/constants/brand';

describe('IndexScreen', () => {
  it('renders the brand background and logo', () => {
    const { getByTestId } = render(<IndexScreen />);
    expect(getByTestId('brand-screen').props.style).toEqual(
      expect.objectContaining({ backgroundColor: brandColours.cream })
    );
  });
});
