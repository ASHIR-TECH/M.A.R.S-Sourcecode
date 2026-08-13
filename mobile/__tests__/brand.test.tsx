import React from 'react';
import { render } from '@testing-library/react-native';
import IndexScreen from '@/app/index';
import { brandColours } from '@/constants/brand';

describe('IndexScreen (splash -> login)', () => {
  it('renders the splash on the cream background first', () => {
    const { getByTestId, queryByTestId } = render(<IndexScreen />);
    expect(getByTestId('splash-screen').props.style).toEqual(
      expect.objectContaining({ backgroundColor: brandColours.cream })
    );
    expect(queryByTestId('sign-in-screen')).toBeNull();
  });

  it('swaps to the login page after the splash duration', () => {
    jest.useFakeTimers();
    const { queryByTestId, getByTestId } = render(<IndexScreen />);
    expect(queryByTestId('sign-in-screen')).toBeNull();

    jest.advanceTimersByTime(2300);
    expect(getByTestId('sign-in-screen')).toBeTruthy();
    expect(queryByTestId('splash-screen')).toBeNull();

    jest.useRealTimers();
  });
});
