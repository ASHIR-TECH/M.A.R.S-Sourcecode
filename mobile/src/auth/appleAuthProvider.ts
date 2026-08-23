import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { AuthProvider, AuthResult, AuthCancelledError } from './types';

export const appleAuthProvider: AuthProvider = {
  async signIn(): Promise<AuthResult> {
    if (Platform.OS !== 'ios') {
      throw new Error('Sign in with Apple is only available on iOS.');
    }

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('Apple sign-in failed: no identity token returned.');
      }

      const fullName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName]
            .filter(Boolean)
            .join(' ')
        : undefined;

      return {
        idToken: credential.identityToken,
        provider: 'apple',
        email: credential.email ?? undefined,
        fullName,
      };
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED') {
        throw new AuthCancelledError();
      }
      throw err;
    }
  },
};
