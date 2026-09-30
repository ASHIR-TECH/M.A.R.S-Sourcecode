import { randomUUID } from 'node:crypto';
import express from 'express';
import { badRequest, unauthorized } from './errors.js';
import { assertAllowedRedirectUri, createRateLimiter, requireAccessToken } from './middleware.js';
import { PROVIDERS, verifyProviderIdentity } from './providers/index.js';
import {
  expiryFromNow,
  generateRefreshToken,
  hashToken,
  newTokenId,
  signAccessToken,
  verifyAccessToken,
} from './tokens.js';

/** The single response shape every provider signs in with. */
function publicUser(user) {
  return {
    id: user.id,
    provider: user.provider,
    email: user.email ?? null,
    emailVerified: Boolean(user.emailVerified),
    name: user.name ?? null,
    picture: user.picture ?? null,
  };
}

async function issueSession({ user, config, store }) {
  const accessToken = await signAccessToken(user, config);
  const refreshToken = generateRefreshToken();
  const tokenId = newTokenId();

  store.createRefreshToken({
    id: tokenId,
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: expiryFromNow(config.refreshTokenTtlSeconds),
  });

  return {
    tokenId,
    body: {
      user: publicUser(user),
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: config.accessTokenTtlSeconds,
    },
  };
}

export function createAuthRouter({ config, store }) {
  const router = express.Router();

  const signInLimiter = createRateLimiter({ windowMs: 60_000, max: 20, code: 'signin_rate_limited' });
  const refreshLimiter = createRateLimiter({ windowMs: 60_000, max: 120, code: 'refresh_rate_limited' });

  // POST /auth/signin — trade a provider code (or Apple identity token) for an
  // app session. This is the only place provider credentials are accepted.
  router.post('/auth/signin', signInLimiter, async (req, res) => {
    const { provider, code, codeVerifier, redirectUri, idToken, nonce, name } = req.body ?? {};

    if (!provider || !PROVIDERS.includes(provider)) {
      throw badRequest(`provider must be one of: ${PROVIDERS.join(', ')}.`, 'unsupported_provider');
    }

    if (provider === 'apple' && !idToken) {
      throw badRequest('idToken is required for Apple sign-in.');
    }
    if (provider === 'github' || (provider === 'google' && !idToken)) {
      if (!code) {
        throw badRequest(`code is required for ${provider} sign-in.`);
      }
      assertAllowedRedirectUri(config, redirectUri);
    }

    const identity = await verifyProviderIdentity({
      provider,
      config,
      code,
      codeVerifier,
      redirectUri,
      idToken,
      nonce,
      name,
    });

    const user = store.upsertUser({ id: randomUUID(), ...identity });
    const session = await issueSession({ user, config, store });

    res.set('Cache-Control', 'no-store');
    res.status(200).json(session.body);
  });

  // POST /auth/refresh — rotate the refresh token. Presenting an already
  // revoked one means it leaked, so every session for that user is dropped.
  router.post('/auth/refresh', refreshLimiter, async (req, res) => {
    const { refreshToken } = req.body ?? {};
    if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
      throw badRequest('refreshToken is required.');
    }

    const record = store.getRefreshTokenByHash(hashToken(refreshToken));

    if (!record) {
      throw unauthorized('That session is not recognised.', 'invalid_refresh_token');
    }
    if (record.revokedAt) {
      // A token retired by rotation being replayed means it was captured, so
      // every session for that user goes. A token retired by logout or expiry
      // is just stale, not evidence of theft.
      if (record.revokedReason === 'rotated') {
        store.revokeAllRefreshTokensForUser(record.userId, 'reuse');
        throw unauthorized(
          'That session was already used, so every session was signed out.',
          'refresh_token_reused'
        );
      }
      throw unauthorized('That session is no longer active.', 'invalid_refresh_token');
    }
    if (Date.parse(record.expiresAt) <= Date.now()) {
      store.revokeRefreshToken(record.id, 'expired');
      throw unauthorized('Your session expired. Please sign in again.', 'invalid_refresh_token');
    }

    const user = store.getUserById(record.userId);
    if (!user) {
      throw unauthorized('That account no longer exists.', 'invalid_refresh_token');
    }

    const session = await issueSession({ user, config, store });
    store.revokeRefreshToken(record.id, 'rotated', session.tokenId);

    res.set('Cache-Control', 'no-store');
    res.status(200).json(session.body);
  });

  // POST /auth/logout — idempotent, and deliberately says nothing about
  // whether the token existed.
  router.post('/auth/logout', async (req, res) => {
    const { refreshToken, allSessions } = req.body ?? {};

    if (typeof refreshToken === 'string' && refreshToken.length > 0) {
      const record = store.getRefreshTokenByHash(hashToken(refreshToken));
      if (record) {
        if (allSessions) {
          store.revokeAllRefreshTokensForUser(record.userId, 'logout');
        } else {
          store.revokeRefreshToken(record.id, 'logout');
        }
      }
    }

    res.status(204).end();
  });

  // GET /auth/me — validate the access token against live user state.
  router.get('/auth/me', requireAccessToken({ config, verifyAccessToken }), (req, res) => {
    const user = store.getUserById(req.auth.sub);
    if (!user) {
      throw unauthorized('That account no longer exists.', 'invalid_token');
    }

    res.set('Cache-Control', 'no-store');
    res.status(200).json({ user: publicUser(user) });
  });

  return router;
}
