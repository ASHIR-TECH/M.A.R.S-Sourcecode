import { StyleSheet } from 'react-native';
/** Line 25 is where to reduce the spacing bewteen the logo and the text after. im putiing comments in the wrong places again. */
export const styles = StyleSheet.create({
  button: {
    backgroundColor: 'rgba(245, 139, 10, 0.14)', /**liquid glass orange tint */
    borderRadius: 10,
    paddingVertical: 20, /**this is for the height  */
    paddingHorizontal: 110, /**this is to increase the signin button width */
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  topGloss: {
    position: 'absolute',
    top: '-14%',
    left: 0,
    right: 0,
    height: '28%',
    backgroundColor: 'rgba(255,255,255,0.10)',
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
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 18,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
});