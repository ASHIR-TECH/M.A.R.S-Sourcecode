import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

function list(value) {
  return (value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Reads and validates configuration once at boot. Failing fast here is the
 * point: an auth service that silently starts without a signing key or without
 * a redirect allowlist is worse than one that refuses to run.
 */
export function loadConfig(env = process.env) {
  const jwtSecret = env.JWT_SECRET ?? '';
  if (jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET must be set to at least 32 characters. Generate one with:\n' +
        "  node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\""
    );
  }

  const allowedRedirectUris = list(env.ALLOWED_REDIRECT_URIS);
  if (allowedRedirectUris.length === 0) {
    throw new Error(
      'ALLOWED_REDIRECT_URIS must list every redirect URI the app may use, comma separated.\n' +
        'Example: mars://auth,exp://192.168.1.20:8081/--/auth,https://app.example.com/auth\n' +
        'Code-flow sign-ins are rejected when this is empty — the server never trusts a ' +
        'redirect URI supplied by the client.'
    );
  }

  return {
    host: env.HOST || '0.0.0.0',
    port: positiveInt(env.PORT, 4000),
    trustProxyHops: positiveInt(env.TRUST_PROXY_HOPS, 1),

    issuer: env.AUTH_ISSUER || 'https://auth.mars.local',
    audience: env.AUTH_AUDIENCE || 'mars-mobile',
    jwtSecret,
    accessTokenTtlSeconds: positiveInt(env.ACCESS_TOKEN_TTL_SECONDS, 900),
    refreshTokenTtlSeconds: positiveInt(env.REFRESH_TOKEN_TTL_SECONDS, 60 * 60 * 24 * 30),

    allowedRedirectUris,
    corsAllowedOrigins: list(env.CORS_ALLOWED_ORIGINS),
    databasePath: env.DATABASE_PATH || path.join(ROOT, 'data', 'auth.db'),

    providers: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
        tokenEndpoint: env.GOOGLE_TOKEN_ENDPOINT || 'https://oauth2.googleapis.com/token',
        jwksUri: env.GOOGLE_JWKS_URI || 'https://www.googleapis.com/oauth2/v3/certs',
      },
      github: {
        clientId: env.GITHUB_CLIENT_ID ?? '',
        clientSecret: env.GITHUB_CLIENT_SECRET ?? '',
        // Overridable for GitHub Enterprise, and for the integration tests that
        // exercise the real exchange against a local stand-in.
        tokenEndpoint: env.GITHUB_TOKEN_ENDPOINT || 'https://github.com/login/oauth/access_token',
        apiRoot: (env.GITHUB_API_ROOT || 'https://api.github.com').replace(/\/+$/, ''),
      },
      apple: {
        clientId: env.APPLE_CLIENT_ID ?? '',
        jwksUri: env.APPLE_JWKS_URI || 'https://appleid.apple.com/auth/keys',
      },
    },
  };
}

export function configuredProviders(config) {
  return {
    google: Boolean(config.providers.google.clientId),
    github: Boolean(config.providers.github.clientId && config.providers.github.clientSecret),
    apple: Boolean(config.providers.apple.clientId),
  };
}
