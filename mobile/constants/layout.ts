/**
 * MARS layout tokens — spacing scale, radii and touch target minimums.
 * All interactive elements must be at least `touch.minimum` (44pt) tall.
 */
export const layout = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    pill: 999,
  },
  touch: {
    minimum: 44,
  },
  header: {
    height: 56,
  },
  inputBar: {
    height: 56,
  },
  tab: {
    height: 56,
  },
} as const;

export type LayoutTokens = typeof layout;
