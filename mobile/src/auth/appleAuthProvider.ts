import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { AuthProvider, AuthResult } from './types';

export const appleAuthProvider: AuthProvider = {
  async signIn(): Promise<AuthResult> {
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

    const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(' ') || undefined;

    return {
      idToken: credential.identityToken,
      provider: 'apple',
      email: credential.email ?? undefined,
      fullName,
    };
  },
};
