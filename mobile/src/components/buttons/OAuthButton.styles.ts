import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
/** line 7 and 9 is where you can change the size and padding of the login buttons */
export const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.textPrimary,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    color: '#0B0704',
    fontWeight: '600',
    fontSize: 14.5,
  },
});
