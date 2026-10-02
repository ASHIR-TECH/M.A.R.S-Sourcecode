import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { signInButton } from '../../theme/signInButtons';
/** line 16 is how to push the svg upwards */
/** Line 34 is where you change the buttons and move them upwards */
/** Line 28 is to reduce the space bewteen welcome and the text from mr potato head */
export const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: 50,
  },
  title: {
    ...typography.splashTitle,
    fontSize: 36,
    color: colors.textPrimary,
    marginBottom: 24,
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  centerBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateY: 20 }], /**move the welcome text and buttons downwards */
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: -170,
    fontSize: 16,
    lineHeight: 26,
  },
  actions: {
    gap: 12,
    marginTop: 215,
  },
  appleButton: {
    /** Shares signInButton.width so the third option lines up with the other
        two instead of staying at the old fixed 320. */
    width: signInButton.width,
    height: signInButton.height,
    alignSelf: 'center',
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
