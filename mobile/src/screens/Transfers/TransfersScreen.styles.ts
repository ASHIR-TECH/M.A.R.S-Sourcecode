import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  back: { color: colors.textMuted, fontSize: 22, paddingRight: spacing.sm, fontFamily: fonts.montserrat },
  title: { flex: 1, color: colors.textPrimary, fontSize: 18, fontFamily: fonts.quantico, letterSpacing: 1 },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.montserrat,
  },
  list: { paddingBottom: spacing.xl },
  row: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232,163,77,0.4)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowGlyph: { fontSize: 18, width: 26, textAlign: 'center' },
  rowBody: { flex: 1 },
  rowName: { color: colors.textPrimary, fontSize: 13, fontFamily: fonts.montserrat, fontWeight: '600' },
  rowMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2, fontFamily: fonts.montserrat },
  statusPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusOk: { backgroundColor: 'rgba(91,196,138,0.18)' },
  statusRunning: { backgroundColor: 'rgba(232,163,77,0.18)' },
  statusBad: { backgroundColor: 'rgba(224,90,71,0.18)' },
  statusOkText: { color: '#5BC48A', fontSize: 10, fontWeight: '700' },
  statusRunningText: { color: '#E8A34D', fontSize: 10, fontWeight: '700' },
  statusBadText: { color: '#E05A47', fontSize: 10, fontWeight: '700' },
});

export const statusStyles = styles;