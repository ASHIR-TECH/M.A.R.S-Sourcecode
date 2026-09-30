import { createRemoteJWKSet, jwtVerify } from 'jose';
import { misconfigured, unauthorized, upstream } from '../errors.js';

const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

function truthy(value) {
  return value === true || value === 'true';
}

export async function exchangeCode({ config, code, codeVerifier, redirectUri, nonce }) {
  const { clientId, clientSecret, tokenEndpoint, jwksUri } = config.providers.google;
  if (!clientId) throw misconfigured('Google sign-in is not configured on this server.');

  const body = new URLSearchParams({
    client_id: clientId,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });
  if (codeVerifier) body.set('code_verifier', codeVerifier);
  if (clientSecret) body.set('client_secret', clientSecret);

  let response;
  try {
    response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
    });
  } catch {
    throw upstream('Could not reach Google.');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    throw unauthorized(payload.error_description || 'Google rejected the sign-in request.', 'provider_rejected');
  }
  if (!payload.id_token) {
    throw unauthorized('Google did not return an identity token.', 'provider_rejected');
  }

  return normalize(await verifyIdToken(payload.id_token, { jwksUri, clientId, nonce }));
}

/**
 * Verifies Google's signed id_token: RS256 signature against Google's published
 * keys, our client as the audience, a known issuer, and (when the app sent one)
 * a nonce it generated itself. Without this the app would accept any Google
 * token, including one minted for a different app.
 */
export async function verifyIdToken(idToken, { jwksUri, clientId, nonce }) {
  let payload;
  try {
    const jwks = createRemoteJWKSet(new URL(jwksUri));
    ({ payload } = await jwtVerify(idToken, jwks, { audience: clientId, algorithms: ['RS256'] }));
  } catch {
    throw unauthorized('Google identity token could not be verified.', 'provider_rejected');
  }

  if (!GOOGLE_ISSUERS.has(String(payload.iss))) {
    throw unauthorized('Google identity token had an unexpected issuer.', 'provider_rejected');
  }
  if (nonce && payload.nonce !== nonce) {
    throw unauthorized('Google identity token nonce mismatch.', 'provider_rejected');
  }
  if (!payload.sub) {
    throw unauthorized('Google identity token had no subject.', 'provider_rejected');
  }
  return payload;
}

export function normalize(payload) {
  return {
    provider: 'google',
    providerSub: String(payload.sub),
    email: payload.email ?? null,
    emailVerified: truthy(payload.email_verified),
    name: payload.name ?? null,
    picture: payload.picture ?? null,
  };
}
