/**
 * Font family references.
 *
 * Audiowide is used for the wordmark and screen titles; Offside for body text.
 * Fonts are loaded at startup via expo-font in `app/_layout.tsx`. The family
 * name in this object must match the key passed to `useFonts`, which becomes
 * the runtime family name on both platforms.
 */
export const fonts = {
  wordmark: 'Audiowide',
  heading: 'Audiowide',
  body: 'Offside',
  mono: 'monospace',
} as const;

/** Local font files (Google Fonts, OFL licensed). */
export const fontAssets = {
  'Audiowide': require('@/assets/fonts/Audiowide-Regular.ttf'),
  'Offside': require('@/assets/fonts/Offside-Regular.ttf'),
} as const;
