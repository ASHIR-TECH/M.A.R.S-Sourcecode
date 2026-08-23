# Phase 1 — Splash Screen

**Module:** `screens/SplashScreen`
**Depends on:** Theme constants, static assets (background image, logo SVG, Audiowide font)
**Blocks:** Phase 2 (Login) — navigation target after splash completes

---

## 1. Requirements

### 1.1 Functional Requirements
| ID | Requirement |
|----|-------------|
| FR-1 | App displays a splash screen immediately on cold start |
| FR-2 | Splash shows: full-bleed background image, centered planet/logo SVG, "MARS" wordmark in Audiowide font, "By ASHIR" footer text |
| FR-3 | Splash is visible for a fixed duration of 0.75s minimum, then auto-navigates |
| FR-4 | Navigation target is the Auth stack (Sign In screen) |
| FR-5 | Splash does not block on network — it is purely presentational, no data fetching |

### 1.2 Non-Functional Requirements
| ID | Requirement |
|----|-------------|
| NFR-1 | No visible flash of unstyled content (native splash → JS splash must be seamless) |
| NFR-2 | Font must be fully loaded before "MARS" text renders (no FOUT) |
| NFR-3 | Works on both iOS and Android without layout shift |
| NFR-4 | Component is unit-testable (timer logic isolated from UI) |

### 1.3 Out of Scope (explicitly deferred)
- Auth-state checking (deciding whether to route to Home instead of Sign In) — deferred to Phase 2 integration, noted as a TODO hook
- Animated logo entrance — v1 is static per the Figma frame; can be layered in later without changing structure

---

## 2. Architecture & Design Decisions

### 2.1 Two-layer splash strategy
React Native has an unavoidable gap between native app launch and JS bundle execution. We use **two splash layers**:

1. **Native splash** (`expo-splash-screen`) — shown instantly by the OS before JS even runs. Uses the same background image so the transition to layer 2 is invisible.
2. **JS SplashScreen component** — takes over once React is mounted, handles the font-loading gate and the 0.75s timer, then hides itself and the native layer together.

This avoids the common bug where the native splash disappears the instant JS starts, revealing an unstyled/blank frame before the custom component paints.

### 2.2 Why a dedicated hook (`useSplashTimer`) instead of logic inline
Timer + font-loading logic is extracted into `useSplashTimer.ts` so it can be:
- Unit tested with fake timers, with zero rendering involved
- Reused if a future screen needs a similar "minimum visible duration" pattern (e.g. a loading screen)

This follows **separation of concerns**: `SplashScreen.tsx` is presentation-only; the hook owns all state/timing logic.

### 2.3 Asset pipeline
- Background: static image asset, preloaded via `expo-asset` so it paints instantly (no lazy pop-in)
- Logo: SVG rendered via `react-native-svg` (already a dependency from the wider app) — keeps it crisp at any resolution, unlike a PNG
- Font: `Audiowide-Regular.ttf` loaded via `expo-font` inside `App.tsx`'s root font-loading gate, **not** inside the splash screen itself, so any screen can safely use it later

---

## 3. File Structure

```
assets/
  fonts/
    Audiowide-Regular.ttf
  images/
    splash-bg.png              # your saved background
  icons/
    mars-logo.svg               # your saved icon, converted to a RN SVG component

src/
  theme/
    colors.ts
    typography.ts
    spacing.ts
  components/
    icons/
      MarsLogo.tsx               # SVG wrapped as a component
  screens/
    Splash/
      SplashScreen.tsx
      SplashScreen.styles.ts
      useSplashTimer.ts
      SplashScreen.test.tsx
  navigation/
    RootNavigator.tsx            # Splash is the initial route here
App.tsx
app.json                         # expo-splash-screen config
```

---

## 4. Dependencies

```bash
npx expo install expo-splash-screen expo-font expo-asset react-native-svg
```

---

## 5. Implementation

### 5.1 Convert your SVG to a component

Take your saved `mars-logo.svg` and place the raw markup into a component so it renders natively (crisper and more flexible than an `<Image>`):

```tsx
// src/components/icons/MarsLogo.tsx
import React from 'react';
import Svg, { Path, Circle, SvgProps } from 'react-native-svg';

interface MarsLogoProps extends SvgProps {
  size?: number;
  color?: string;
}

/**
 * Saturn/planet wordmark icon used on Splash and Sign In screens.
 * Replace the <Path>/<Circle> children below with the exact paths
 * exported from your saved SVG file — this is a structural placeholder.
 */
export function MarsLogo({ size = 96, color = '#F5EFE6', ...rest }: MarsLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 96 96" fill="none" {...rest}>
      <Circle cx="48" cy="48" r="28" stroke={color} strokeWidth="2" />
      <Path
        d="M8 40 Q48 20 88 40"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}
```

> Swap in the exact `<Path>` data from your exported SVG — open the `.svg` file in a text editor and copy the `<path>`/`<circle>` elements directly into this component's JSX.

### 5.2 Theme tokens used by this screen

```ts
// src/theme/colors.ts
export const colors = {
  background: '#0B0704',
  backgroundGradientEnd: '#1A0F08',
  textPrimary: '#F5EFE6',
  textMuted: '#8A7A68',
  accent: '#E8A34D',
} as const;
```

```ts
// src/theme/typography.ts
export const fonts = {
  display: 'Audiowide-Regular',
} as const;

export const typography = {
  splashTitle: {
    fontFamily: fonts.display,
    fontSize: 32,
    letterSpacing: 4,
  },
  splashFooter: {
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
} as const;
```

```ts
// src/theme/spacing.ts
export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
} as const;
```

### 5.3 The timer hook (logic layer)

```ts
// src/screens/Splash/useSplashTimer.ts
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
```

### 5.4 The screen component (presentation layer)

```tsx
// src/screens/Splash/SplashScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, ImageBackground } from 'react-native';
import * as SplashScreenNative from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { MarsLogo } from '../../components/icons/MarsLogo';
import { useSplashTimer } from './useSplashTimer';
import { styles } from './SplashScreen.styles';

// Prevent the native splash from auto-hiding until we explicitly say so.
SplashScreenNative.preventAutoHideAsync().catch(() => {
  // no-op: safe to ignore if already prevented
});

interface SplashScreenProps {
  /** Called once splash has fully completed and it's safe to navigate away */
  onFinished: () => void;
}

export function SplashScreen({ onFinished }: SplashScreenProps) {
  const { isReadyToNavigate, markAssetsReady } = useSplashTimer();

  const [fontsLoaded, fontError] = useFonts({
    'Audiowide-Regular': require('../../../assets/fonts/Audiowide-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      markAssetsReady();
    }
  }, [fontsLoaded, fontError, markAssetsReady]);

  useEffect(() => {
    if (isReadyToNavigate) {
      SplashScreenNative.hideAsync().finally(onFinished);
    }
  }, [isReadyToNavigate, onFinished]);

  // Keep native splash visible until fonts are loaded — render nothing
  // rather than an unstyled fallback.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ImageBackground
      source={require('../../../assets/images/splash-bg.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <MarsLogo size={120} />
          <Text style={styles.title}>MARS</Text>
        </View>
        <Text style={styles.footer}>By ASHIR</Text>
      </View>
    </ImageBackground>
  );
}
```

### 5.5 Styles

```ts
// src/screens/Splash/SplashScreen.styles.ts
import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    ...typography.splashTitle,
    color: colors.textPrimary,
  },
  footer: {
    ...typography.splashFooter,
    color: colors.textMuted,
  },
});
```

### 5.6 Root wiring

```tsx
// App.tsx
import React, { useState } from 'react';
import { SplashScreen } from './src/screens/Splash/SplashScreen';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return <SplashScreen onFinished={() => setSplashDone(true)} />;
  }

  return <RootNavigator />;
}
```

### 5.7 Native splash config

```json
// app.json (relevant excerpt)
{
  "expo": {
    "splash": {
      "image": "./assets/images/splash-bg.png",
      "resizeMode": "cover",
      "backgroundColor": "#0B0704"
    }
  }
}
```

---

## 6. Testing

```tsx
// src/screens/Splash/SplashScreen.test.tsx
import { renderHook, act } from '@testing-library/react-hooks';
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
```

**Manual QA checklist:**
- [ ] Cold start on iOS shows no white/blank flash before background paints
- [ ] Cold start on Android shows no white/blank flash before background paints
- [ ] "MARS" renders in Audiowide, not a fallback system font, even on a fast device
- [ ] Splash is visible for a perceptible but not sluggish ~0.75s
- [ ] Rotating the device mid-splash does not break layout (test in dev only; likely locked to portrait in production)

---

## 7. Acceptance Criteria (Definition of Done)

- [ ] `SplashScreen` renders background, logo, "MARS" title, and "By ASHIR" footer matching Figma frame `mars-splash`
- [ ] Total splash duration is never less than 750ms, regardless of asset load speed
- [ ] Font is guaranteed loaded before "MARS" text is ever painted
- [ ] No blank/white frame on either platform during cold start
- [ ] `onFinished` callback fires exactly once
- [ ] Unit tests for `useSplashTimer` pass
- [ ] Component has zero data-fetching or navigation logic of its own beyond calling `onFinished`
