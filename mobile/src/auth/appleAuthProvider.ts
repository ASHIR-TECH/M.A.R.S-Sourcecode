import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { AuthProvider, OAuthGrant } from './types';

export const appleAuthProvider: AuthProvider = {
  async signIn(): Promise<OAuthGrant> {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign In is only available on iOS.');
    }

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('Apple Sign In returned no identity token.');
    }

    // Apple only returns the name and email on the very first authorization,
    // so they travel with the grant and the server keeps them on file.
    const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(' ');

    return {
      provider: 'apple',
      idToken: credential.identityToken,
      name: fullName || undefined,
    };
  },
};
