import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { tabBarMetrics } from '../../navigation/TabNavigator.styles';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl * 2,
    paddingBottom: tabBarMetrics.height + 24,
    gap: spacing.lg,
  },
  header: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitleBlock: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
  }, /**this is for the cc2 heading */
  title: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontSize: 15,
    letterSpacing: 1.5,
    alignSelf: 'stretch',
    textAlign: 'left',
  },
  subtitle: { /** this is for the subtitle under the heading */
    color: colors.textMuted,
    fontFamily: fonts.display,
    fontSize: 10,
    letterSpacing: 0.5,
    marginTop: 1,
    alignSelf: 'stretch',
    textAlign: 'left',
  },
  avatar: { /** this is for the OP */
    position: 'absolute',
    right: 0,
    top: -2.5,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: spacing.sm },
  chatSection: {
    gap: spacing.sm,
  },
  announcementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  announcementWrap: {
    flex: 1,
  },
  // With no announcement the SCAN pill keeps its old right-hand slot instead of
  // the row collapsing and shifting the chat list up.
  announcementRowSolo: {
    justifyContent: 'flex-end',
  },
  announcementCard: {
    marginBottom: 0,
  },
  scanButton: {
    width: 86,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  scanButtonInner: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontFamily: fonts.quantico,
    fontSize: 13,
    letterSpacing: 3,
  },
  chatListWrap: {
    flexDirection: 'row',
    height: 220,
    gap: 10,
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingBottom: 0,
  },
  chatSeparator: {
    height: 8,
  },
  scrollTrack: {
    width: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  scrollThumb: {
    position: 'absolute',
    left: 0,
    width: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(232, 163, 77, 0.2)',
  },
  deviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    rowGap: 12,
    columnGap: 12,
  },
  deviceGridItem: {
    flexBasis: '45%',
    flexGrow: 1,
    maxWidth: 180,
  },
  // Sits in normal flow below the grid — it used to be absolutely positioned
  // over the whole grid, which smeared it across the placeholder cards.
  pairPrompt: {
    alignSelf: 'center',
    marginTop: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(11, 7, 4, 0.78)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(215, 128, 30, 0.45)',
  },
  pairPromptPressed: {
    opacity: 0.7,
  },
  pairPromptText: {
    color: '#FFFFFF',
    fontFamily: fonts.quantico,
    fontSize: 12,
    letterSpacing: 1,
    textAlign: 'center',
  },
});
