import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { tabBarMetrics } from '../../navigation/TabNavigator.styles';

/**
 * Space the composer reserves below the thread while the keyboard is closed, so
 * it clears the tab bar plus a little breathing room. ChatScreen fades this to
 * zero as the keyboard opens (and adds the live, device-measured keyboard height
 * on top), so the composer lands flush on the top edge of the keyboard.
 */
export const chatBottomInset = tabBarMetrics.height + spacing.xxl;

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl * 1.5,
    paddingBottom: spacing.sm,
  },
  title: { color: colors.textPrimary, fontFamily: fonts.quantico, fontWeight: '700', fontSize: 20, letterSpacing: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#01ea89' },
  headerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  headerLight: {
    position: 'absolute',
    top: 0,
    width: 120,
    height: StyleSheet.hairlineWidth + 1,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  thread: { paddingTop: spacing.xl, paddingBottom: spacing.md },
  inputWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    // Breathing room below the composer is folded into chatBottomInset so the
    // open-keyboard state can be truly flush; keep this at zero.
    paddingBottom: 0,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    backgroundColor: 'rgba(15, 9, 4, 0.85)',
    borderRadius: 24,
    paddingVertical: 6,
    paddingLeft: spacing.md,
    paddingRight: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 163, 77, 0.35)',
    shadowColor: colors.accent,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  // Relative host for the TextInput so the hint can sit on top of it without
  // pushing the field around.
  inputField: { flex: 1, justifyContent: 'center' },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    fontFamily: fonts.montserrat,
    paddingVertical: spacing.sm + 2,
    maxHeight: 120,
    textAlignVertical: 'center',
  },
  /**
   * The idle hint, rendered by us (not TextInput.placeholder) so it stays on a
   * single line, dims down, and can be cleared away the moment the field is
   * focused — leaving only the accent-coloured caret.
   */
  placeholder: {
    position: 'absolute',
    left: 0,
    right: 0,
    color: 'rgba(245,239,230,0.34)',
    fontSize: 11,
    fontFamily: fonts.montserrat,
    letterSpacing: 0.1,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: { color: '#0B0704', fontSize: 16 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginLeft: spacing.xs,
    paddingBottom: 2,
  },
  // Link (attach) affordance — amber-on-amber so it reads as an action, not
  // decoration, instead of the old neutral "+" disc.
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(232,163,77,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232,163,77,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachIcon: {
    width: 20,
    height: 20,
    tintColor: 'rgba(232,163,77,0.92)',
  },
});
