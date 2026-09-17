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
  updated: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs },
  intro: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.md,
  },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  section: { marginBottom: spacing.lg },
  heading: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  paragraph: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  bullet: {
    color: colors.accent,
    fontSize: 13,
    lineHeight: 20,
    marginRight: spacing.sm,
  },
  bulletText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
});
