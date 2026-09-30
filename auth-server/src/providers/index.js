import { badRequest } from '../errors.js';
import * as google from './google.js';
import * as github from './github.js';
import * as apple from './apple.js';

export const PROVIDERS = ['google', 'github', 'apple'];

/**
 * Exchanges whatever the app obtained from a provider for a verified,
 * normalized identity. Each adapter returns the same shape, so the caller
 * never branches on which provider signed the user in.
 */
export async function verifyProviderIdentity({ provider, config, code, codeVerifier, redirectUri, idToken, nonce, name }) {
  switch (provider) {
    case 'google':
      if (idToken) {
        // Implicit-flow fallback for older app builds; still signature verified.
        return google.normalize(
          await google.verifyIdToken(idToken, {
            jwksUri: config.providers.google.jwksUri,
            clientId: config.providers.google.clientId,
            nonce,
          })
        );
      }
      return google.exchangeCode({ config, code, codeVerifier, redirectUri, nonce });

    case 'github':
      return github.exchangeCode({ config, code, codeVerifier, redirectUri });

    case 'apple':
      return apple.verifyIdentityToken({ config, idToken, nonce, name });

    default:
      throw badRequest(`Unsupported provider "${provider}".`, 'unsupported_provider');
  }
}
