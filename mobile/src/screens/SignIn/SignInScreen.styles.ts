import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
/** line 16 is how to push the svg upwards */
/** Line 34 is where you change the buttons and move them upwards */
/** Line 28 is to reduce the space bewteen welcome and the text from mr potato head */
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginTop: 100, /**this is to shift the welcome sign */
  },
  title: {
    ...typography.splashTitle,
    fontSize: 28,
    color: colors.textPrimary,
  },
  centerBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: -100, /**this is for the space bewteen the text and logins */
    lineHeight: 19, /**this is the text spacing  */
  },
  actions: {
    gap: 12,
    marginTop: 215,
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
    paddingBottom: spacing.lg,
  },
  link: {
    color: colors.accent,
    textDecorationLine: 'underline',
  },
});
