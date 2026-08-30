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
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  headerTitle: { color: colors.textPrimary, fontFamily: fonts.quantico, letterSpacing: 2, fontSize: 13 },
  closeButton: {
    position: 'absolute',
    right: spacing.md,
    padding: spacing.sm,
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
  scanText: { color: colors.textPrimary, fontFamily: fonts.quantico, fontSize: 18 },
  scanSubtitle: { color: colors.textMuted, fontFamily: fonts.quantico, fontSize: 12, textAlign: 'center' },
  statusText: { color: colors.accent, fontFamily: fonts.quantico, fontSize: 13, marginTop: spacing.sm },
  errorText: {
    color: '#E05A47',
    fontFamily: fonts.quantico,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});