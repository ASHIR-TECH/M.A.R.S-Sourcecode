import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { fonts } from '../../theme/typography';

export const SCAN_TARGET_SIZE = 240;

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: colors.textPrimary,
    fontFamily: fonts.quantico,
    letterSpacing: 4,
    fontSize: 13,
  },
  manualButton: {
    padding: spacing.sm,
  },
  manualText: { color: '#FFFFFF', fontFamily: fonts.montserrat, fontSize: 16 },
  closeButton: {
    padding: spacing.sm,
    minWidth: 32,
    alignItems: 'center',
  },
  closeText: { color: colors.textMuted, fontSize: 18 },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  scanTarget: {
    width: SCAN_TARGET_SIZE,
    height: SCAN_TARGET_SIZE,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.accent,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  textBlock: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  scanText: { color: colors.textPrimary, fontFamily: fonts.quantico, fontSize: 18, textAlign: 'center' },
  scanSubtitle: { color: '#C4B197', fontFamily: fonts.quantico, fontSize: 12, textAlign: 'center' },
  statusText: { color: colors.accent, fontFamily: fonts.quantico, fontSize: 13, marginTop: spacing.sm },
  errorText: {
    color: '#E05A47',
    fontFamily: fonts.quantico,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 110,
    paddingTop: spacing.xl,
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(215, 128, 30, 0.5)',
  },
});