import { badRequest, unauthorized } from './errors.js';

export function securityHeaders(_req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  });
  next();
}

/**
 * Fixed-window per-IP limiter. Enough to blunt credential stuffing and
 * provider-token hammering without pulling in a dependency.
 */
export function createRateLimiter({ windowMs, max, code = 'rate_limited' }) {
  const hits = new Map();

  return function rateLimit(req, res, next) {
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const cutoff = now - windowMs;

    const timestamps = (hits.get(key) || []).filter((stamp) => stamp > cutoff);
    if (timestamps.length >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((timestamps[0] + windowMs - now) / 1000));
      res.set('Retry-After', String(retryAfterSeconds));
      next(rateLimited(429, code, 'Too many attempts. Please wait a moment and try again.'));
      return;
    }

    timestamps.push(now);
    hits.set(key, timestamps);

    if (hits.size > 10_000) {
      for (const [entryKey, stamps] of hits) {
        if (stamps.every((stamp) => stamp <= cutoff)) hits.delete(entryKey);
      }
    }

    next();
  };
}

export function rateLimited(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.expose = true;
  return error;
}

/** Never trust a client-supplied redirect URI: it must be on the allowlist. */
export function assertAllowedRedirectUri(config, redirectUri) {
  if (typeof redirectUri !== 'string' || redirectUri.length === 0) {
    throw badRequest('redirectUri is required.', 'invalid_request');
  }
  if (!config.allowedRedirectUris.includes(redirectUri)) {
    throw badRequest('That redirect URI is not allowed for this server.', 'redirect_uri_not_allowed');
  }
  return redirectUri;
}

export function requireAccessToken({ config, verifyAccessToken }) {
  return function authenticate(req, _res, next) {
    const header = req.get('authorization') || '';
    const [scheme, token] = header.split(' ');
    if (!token || scheme.toLowerCase() !== 'bearer') {
      next(unauthorized('A bearer access token is required.'));
      return;
    }
    verifyAccessToken(token, config)
      .then((payload) => {
        req.auth = payload;
        next();
      })
      .catch(next);
  };
}

export function notFound(_req, _res, next) {
  next(Object.assign(new Error('Not found.'), { status: 404, code: 'not_found', expose: true }));
}

export function errorHandler(logger = console) {
  // eslint-disable-next-line no-unused-vars -- Express identifies handlers by arity.
  return function handleError(err, _req, res, _next) {
    // body-parser reports an over-cap or malformed body as a 413/400 with
    // `status` but no `code`, so translate it into the normal error shape
    // instead of letting it fall through as a 500.
    const status = err.status || err.statusCode || 500;
    const isClientError = status >= 400 && status < 500;
    const code = err.code && err.code !== 'entity.too.large' ? err.code : isClientError ? 'invalid_request' : 'internal_error';
    const expose = err.expose || isClientError;

    if (status >= 500) {
      logger.error('[auth] request failed', code, err.message);
    }

    if (res.headersSent) return;

    res.status(status).json({
      error: {
        code,
        message: expose ? err.message : 'Something went wrong on our side.',
      },
    });
  };
}
