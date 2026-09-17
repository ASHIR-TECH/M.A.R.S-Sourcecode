import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: spacing.xxl + 24, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  closeButton: {
    position: 'absolute',
    top: spacing.xxl,
    right: spacing.lg,
    padding: spacing.sm,
  },
  closeText: { color: colors.textMuted, fontSize: 18 },
  kicker: {
    color: colors.accent,
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: '700',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: spacing.xs },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  note: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  lead: { color: colors.textPrimary, fontWeight: '600' },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: spacing.md,
  },
});
