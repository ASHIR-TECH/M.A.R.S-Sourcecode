/**
 * OAuth provider configuration.
 *
 * Fill these in with the OAuth client IDs issued for the MARS app:
 *   - Google Cloud Console: one client per platform (iOS, Android, Web).
 *     The web client ID drives the Expo Go development flow.
 *   - Apple Developer: a Service ID whose client ID is the reverse-DNS
 *     identifier of the service, plus the corresponding redirect URI.
 *
 * Leaving an ID empty makes the Login screen show a "not configured" hint
 * instead of attempting a broken flow.
 */
export const authConfig = {
  google: {
    iosClientId: '',
    androidClientId: '',
    webClientId: '',
  },
  apple: {
    clientId: '',
    redirectUri: 'https://auth.expo.io/@your-expo-user/mars-mobile',
  },
} as const;

export const isGoogleConfigured =
  Boolean(authConfig.google.iosClientId) ||
  Boolean(authConfig.google.androidClientId) ||
  Boolean(authConfig.google.webClientId);

export const isAppleConfigured = Boolean(authConfig.apple.clientId);
