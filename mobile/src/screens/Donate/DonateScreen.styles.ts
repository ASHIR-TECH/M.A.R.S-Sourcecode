import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
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
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  amountChip: { flex: 1, paddingHorizontal: spacing.xs },
  customInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(215,128,30,0.3)',
    padding: spacing.md,
    color: colors.textPrimary,
  },
  errorText: { color: '#E05A47', fontSize: 13 },
  donateButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  donateButtonDisabled: { opacity: 0.4 },
  donateButtonPressed: { backgroundColor: '#D7801E' },
  donateButtonText: { color: '#0B0704', fontWeight: '700', fontSize: 15 },
});