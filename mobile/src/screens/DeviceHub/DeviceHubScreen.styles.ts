import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, paddingTop: spacing.xxl * 2 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  back: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
  title: { color: colors.textPrimary, fontFamily: fonts.quantico, fontWeight: '700', fontSize: 15, letterSpacing: 1 },
  add: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  sectionLabel: { color: '#FFFFFF', fontFamily: fonts.quantico, fontSize: 12, marginBottom: spacing.sm, textTransform: 'uppercase' },
  grid: { gap: spacing.sm, paddingBottom: spacing.xxl },
  row: { gap: spacing.sm },
  empty: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xxl },
  emptyTitle: {
    color: colors.textPrimary,
    fontFamily: fonts.quantico,
    fontSize: 13,
    letterSpacing: 1,
  },
  emptyBody: {
    color: '#FFFFFF',
    fontFamily: fonts.montserrat,
    fontSize: 13,
    opacity: 0.7,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  toast: {
    position: 'absolute',
    bottom: 140, /** raised so the tick confirmation floats higher above the tab bar */
    alignSelf: 'center',
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  toastText: { color: '#0B0704', fontFamily: fonts.montserrat, fontSize: 13, fontWeight: '700' },
});