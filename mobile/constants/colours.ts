/**
 * Blue Eclipse design tokens (Phase 11) translated to TypeScript constants.
 * Mirrors the desktop `tokens.css` palette for the mobile app.
 */
export const colours = {
  bgDeep: '#08080F',
  bgSurface: '#0E0E1C',
  bgSurfaceAlt: '#16162A',
  bgCard: '#0E0E1C',
  purpleDim: '#3A3A6D',
  purplePrimary: '#7C5CFC',
  purpleMuted: '#9B8FD8',
  gold: '#C9A84C',
  goldDim: '#8A7132',
  textPrimary: '#F2F1FF',
  textSecondary: '#8E8CA8',
  textOnGold: '#1A1508',
  danger: '#E5484D',
  success: '#30A46C',
  warning: '#FFB224',
  info: '#7C5CFC',
  border: '#3A3A6D',
  manifestTheme: '#0F0E47',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(8, 8, 15, 0.6)',
} as const;

/** Badge colours keyed by the transfer/agent status string. */
export const statusColours: Record<string, string> = {
  Delivered: '#30A46C',
  Verified: '#30A46C',
  Pending: '#FFB224',
  InProgress: '#7C5CFC',
  Failed: '#E5484D',
  Cancelled: '#8E8CA8',
  Alerted: '#FF7A1A',
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
