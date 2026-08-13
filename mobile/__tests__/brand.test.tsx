import React from 'react';
import { act, render } from '@testing-library/react-native';
import IndexScreen from '@/app/index';

describe('IndexScreen (splash -> login)', () => {
  it('renders the splash on the cream gradient first', () => {
    const { getByTestId, queryByTestId } = render(<IndexScreen />);
    expect(getByTestId('splash-screen').props.colors).toEqual([
      0xfff5f3f1,
      0xfff1f0ea,
      0xffeceae1,
    ]);
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
