/**
 * MARS design tokens — Blue Eclipse variant.
 * Values follow the Colour System table in the MARS Mobile Build Spec.
 * Every colour in the app must come from this module — no hardcoded hex.
 */
export const colours = {
  bgDeep: '#08080F',
  bgSurface: '#0E0E1C',
  bgElevated: '#14142B',
  bgOverlay: '#1C1C3A',
  purpleDim: '#2A2A5A',
  purpleMid: '#4B4B8F',
  purpleBright: '#7C7CBF',
  gold: '#C9A84C',
  goldBright: '#E8D38A',
  goldDim: '#A8893A',
  ember: '#C8430A',
  stateSuccess: '#3FA66B',
  stateWarning: '#D9A441',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0CC',
  textMuted: '#606080',

  // Aliases retained for components migrated from the Phase 11 palette.
  bgSurfaceAlt: '#14142B',
  purpleMuted: '#7C7CBF',
  danger: '#C8430A',
  success: '#3FA66B',
  warning: '#D9A441',
  info: '#7C7CBF',
  border: '#2A2A5A',
  textOnGold: '#1A1508',

  manifestTheme: '#0F0E47',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(8, 8, 15, 0.6)',
} as const;

/** Badge colours keyed by the transfer/agent status string. */
export const statusColours: Record<string, string> = {
  Delivered: '#3FA66B',
  Verified: '#3FA66B',
  Pending: '#D9A441',
  InProgress: '#7C7CBF',
  Failed: '#C8430A',
  Cancelled: '#606080',
  Alerted: '#C8430A',
} as const;

/** Gold gradient stops for wordmarks and screen titles. */
export const goldGradient = {
  colors: ['#A8893A', '#E8D38A', '#A8893A'],
  start: { x: 0, y: 0.5 },
  end: { x: 1, y: 0.5 },
} as const;

export const fontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
} as const;

/** Minimum touch target per Apple HIG / Android Material guidelines. */
export const touchTarget = 44;
