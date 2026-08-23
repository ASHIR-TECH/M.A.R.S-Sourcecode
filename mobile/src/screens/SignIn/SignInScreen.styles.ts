import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
/** line 16 is how to push the svg upwards */
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    gap: spacing.md,
    marginTop: 15,
  },
  title: {
    ...typography.splashTitle,
    fontSize: 28,
    color: colors.textPrimary,
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: 72,
  },
  actions: {
    gap: spacing.md,
  },
  errorText: {
    color: '#E05A47',
    textAlign: 'center',
    fontSize: 13,
  },
  footer: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  link: {
    color: colors.accent,
    textDecorationLine: 'underline',
  },
});
