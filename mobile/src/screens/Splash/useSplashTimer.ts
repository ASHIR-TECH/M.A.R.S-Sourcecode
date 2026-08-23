import { useEffect, useState, useCallback } from 'react';

const MIN_SPLASH_DURATION_MS = 750;

interface UseSplashTimerResult {
  /** True once the minimum display duration has elapsed AND assets are ready */
  isReadyToNavigate: boolean;
  /** Call this once fonts/assets finish loading */
  markAssetsReady: () => void;
}

/**
 * Ensures the splash is visible for at least MIN_SPLASH_DURATION_MS,
 * regardless of how fast assets load — prevents a jarring "flash" on
 * fast devices while still gating on real asset readiness on slow ones.
 */
export function useSplashTimer(): UseSplashTimerResult {
  const [timerElapsed, setTimerElapsed] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setTimerElapsed(true), MIN_SPLASH_DURATION_MS);
    return () => clearTimeout(timeout);
  }, []);

  const markAssetsReady = useCallback(() => setAssetsReady(true), []);

  return {
    isReadyToNavigate: timerElapsed && assetsReady,
    markAssetsReady,
  };
}
