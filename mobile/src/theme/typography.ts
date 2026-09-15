export const fonts = {
  display: 'Audiowide-Regular',
  quantico: 'Quantico-Bold',
  offside: 'Offside-Regular',
  montserrat: 'Montserrat-Regular',
} as const;

export const typography = {
  splashTitle: {
    fontFamily: fonts.display,
    fontSize: 32,
    letterSpacing: 4,
  },
  splashFooter: {
    fontFamily: fonts.display,
    fontSize: 18,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
} as const;
