import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + 24,
    gap: spacing.lg,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBlock: {
    alignItems: 'center',
  },
  headerLogo: {
    position: 'absolute',
    left: 0,
    top: -47, /** to mve the SVG upwards */
  }, /**this is for the cc2 heading */
  title: {
    color: colors.textPrimary,
    fontFamily: fonts.display,
    fontSize: 15,
    letterSpacing: 1.5,
  },
  subtitle: { /** this is for the subtitle under the heading */
    color: colors.textMuted,
    fontFamily: fonts.display,
    fontSize: 10,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  avatar: { /** this is for the OP */
    position: 'absolute',
    right: 0,
    top: -47,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: spacing.sm },
  chatSection: {
    gap: spacing.sm,
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
    gap: 12,
  },
});
