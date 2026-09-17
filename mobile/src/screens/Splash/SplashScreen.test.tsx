import { renderHook, act } from '@testing-library/react-native';
import { useSplashTimer } from './useSplashTimer';

jest.useFakeTimers();

describe('useSplashTimer', () => {
  it('is not ready before the minimum duration even if assets are ready', () => {
    const { result } = renderHook(() => useSplashTimer());
    act(() => result.current.markAssetsReady());
    act(() => jest.advanceTimersByTime(500));
    expect(result.current.isReadyToNavigate).toBe(false);
  });

  it('is not ready after the minimum duration if assets are not ready', () => {
    const { result } = renderHook(() => useSplashTimer());
    act(() => jest.advanceTimersByTime(2500));
    expect(result.current.isReadyToNavigate).toBe(false);
  });

  it('is ready once both the timer elapses and assets are marked ready', () => {
    const { result } = renderHook(() => useSplashTimer());
    act(() => result.current.markAssetsReady());
    act(() => jest.advanceTimersByTime(2500));
    expect(result.current.isReadyToNavigate).toBe(true);
  });
});
