import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
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
});