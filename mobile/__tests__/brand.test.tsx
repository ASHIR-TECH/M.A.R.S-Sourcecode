import React from 'react';
import { act, render } from '@testing-library/react-native';
import IndexScreen from '@/app/index';

describe('IndexScreen (splash -> login)', () => {
  it('renders the splash over the orb background first', () => {
    const { getByTestId, queryByTestId } = render(<IndexScreen />);
    const splash = getByTestId('splash-screen');
    expect(splash.props.colors).toBeUndefined();
    expect(queryByTestId('sign-in-screen')).toBeNull();
  });

  it('swaps to the login page after the splash duration', () => {
    jest.useFakeTimers();
    const { queryByTestId, getByTestId } = render(<IndexScreen />);
    expect(queryByTestId('sign-in-screen')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(2300);
    });
    expect(getByTestId('sign-in-screen')).toBeTruthy();
    expect(queryByTestId('splash-screen')).toBeNull();

    jest.useRealTimers();
  });
});
