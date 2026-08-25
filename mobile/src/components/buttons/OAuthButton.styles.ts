import { StyleSheet } from 'react-native';
import { glass } from '../../theme/glass';
/** Line 25 is where to reduce the spacing bewteen the logo and the text after. im putiing comments in the wrong places again. */
export const styles = StyleSheet.create({
  button: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.borderColor,
    paddingVertical: 14, /**this is for the height  */
    paddingHorizontal: 85, /**this is to increase the signin button width */
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    color: '#F5EFE6',
    fontWeight: '600',
    fontSize: 14,
  },
});
