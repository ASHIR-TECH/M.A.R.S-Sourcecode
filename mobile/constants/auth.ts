/**
 * OAuth provider configuration.
 *
 * Google uses one native client ID per platform (iOS, Android) issued in the
 * Google Cloud Console. Apple Sign-In uses the native `expo-apple-authentication`
 * module, which returns the identity token directly — no client ID needed.
 *
 * Leaving an ID empty makes the Login screen show a "not configured" hint
 * instead of attempting a broken flow.
 */
export const authConfig = {
  google: {
    iosClientId: '1005880771549-c9ke8v0cqnm99ifjpi94ioivuvsavrjr.apps.googleusercontent.com',
    androidClientId: '1005880771549-dokpfvp5lmfl496trtqkha05tpqjg4fl.apps.googleusercontent.com',
    webClientId: '',
  },
} as const;

export const isGoogleConfigured =
  Boolean(authConfig.google.iosClientId) ||
  Boolean(authConfig.google.androidClientId) ||
  Boolean(authConfig.google.webClientId);
