import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { unauthorized } from './errors.js';

const encoder = new TextEncoder();

function signingKey(jwtSecret) {
  return encoder.encode(jwtSecret);
}

/** Short-lived, stateless access token. Never stored server-side. */
export async function signAccessToken(user, config) {
  const issuedAt = Math.floor(Date.now() / 1000);

  return new SignJWT({
    provider: user.provider,
    email: user.email ?? null,
    name: user.name ?? null,
    picture: user.picture ?? null,
    emailVerified: Boolean(user.emailVerified),
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(user.id)
    .setIssuer(config.issuer)
    .setAudience(config.audience)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + config.accessTokenTtlSeconds)
    .setJti(randomUUID())
    .sign(signingKey(config.jwtSecret));
}

export async function verifyAccessToken(token, config) {
  try {
    const { payload } = await jwtVerify(token, signingKey(config.jwtSecret), {
      issuer: config.issuer,
      audience: config.audience,
      algorithms: ['HS256'],
    });
    return payload;
  } catch {
    throw unauthorized('Your session is invalid or has expired.');
  }
}

/** Opaque high-entropy refresh token; only its hash is persisted. */
export function generateRefreshToken() {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function hashesMatch(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function newTokenId() {
  return randomUUID();
}

export function expiryFromNow(seconds) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}
