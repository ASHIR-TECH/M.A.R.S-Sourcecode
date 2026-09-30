import { createRemoteJWKSet, jwtVerify } from 'jose';
import { misconfigured, unauthorized } from '../errors.js';

const APPLE_ISSUER = 'https://appleid.apple.com';

function truthy(value) {
  return value === true || value === 'true';
}

export async function verifyIdentityToken({ config, idToken, nonce, name }) {
  const { clientId, jwksUri } = config.providers.apple;
  if (!clientId) throw misconfigured('Apple sign-in is not configured on this server.');

  let payload;
  try {
    const jwks = createRemoteJWKSet(new URL(jwksUri));
    ({ payload } = await jwtVerify(idToken, jwks, { audience: clientId, algorithms: ['RS256'] }));
  } catch {
    throw unauthorized('Apple identity token could not be verified.', 'provider_rejected');
  }

  if (String(payload.iss) !== APPLE_ISSUER) {
    throw unauthorized('Apple identity token had an unexpected issuer.', 'provider_rejected');
  }
  if (nonce && payload.nonce !== nonce) {
    throw unauthorized('Apple identity token nonce mismatch.', 'provider_rejected');
  }
  if (!payload.sub) {
    throw unauthorized('Apple identity token had no subject.', 'provider_rejected');
  }

  return {
    provider: 'apple',
    providerSub: String(payload.sub),
    // Apple only sends the email on the very first authorization, and only
    // once. Later sign-ins keep the address we stored earlier.
    email: payload.email ?? null,
    emailVerified: truthy(payload.email_verified),
    // The name is likewise first-time-only, and it travels with the app, not
    // the token, so fall back to whatever we already have on file.
    name: name ?? null,
    picture: null,
  };
}
