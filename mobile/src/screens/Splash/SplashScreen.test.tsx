import { renderHook, act } from '@testing-library/react-native';
import { useSplashTimer } from './useSplashTimer';

jest.useFakeTimers();

describe('useSplashTimer', () => {
  it('is not ready before 750ms even if assets are ready', () => {
    const { result } = renderHook(() => useSplashTimer());
    act(() => result.current.markAssetsReady());
    act(() => jest.advanceTimersByTime(500));
    expect(result.current.isReadyToNavigate).toBe(false);
  });

  it('is not ready after 750ms if assets are not ready', () => {
    const { result } = renderHook(() => useSplashTimer());
    act(() => jest.advanceTimersByTime(750));
    expect(result.current.isReadyToNavigate).toBe(false);
  });

  it('is ready once both the timer elapses and assets are marked ready', () => {
    const { result } = renderHook(() => useSplashTimer());
    act(() => result.current.markAssetsReady());
    act(() => jest.advanceTimersByTime(750));
    expect(result.current.isReadyToNavigate).toBe(true);
  });
});
