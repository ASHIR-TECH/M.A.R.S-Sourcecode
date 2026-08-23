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
