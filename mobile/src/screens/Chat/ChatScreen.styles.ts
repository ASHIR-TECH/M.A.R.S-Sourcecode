import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 96 },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  title: { color: colors.textPrimary, fontFamily: fonts.quantico, fontWeight: '700', fontSize: 13, letterSpacing: 1 },
  status: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  thread: { paddingBottom: spacing.md },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 17,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    color: colors.textPrimary,
    fontSize: 16,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: { color: '#0B0704', fontSize: 18 },
});