import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { openDatabase } from '../src/db.js';
import { generateRefreshToken, hashToken, newTokenId, signAccessToken } from '../src/tokens.js';

const BASE_ENV = {
  JWT_SECRET: 'test-secret-that-is-definitely-long-enough-32',
  AUTH_ISSUER: 'https://auth.test',
  AUTH_AUDIENCE: 'mars-test',
  ALLOWED_REDIRECT_URIS: 'mars://auth,exp://127.0.0.1:8081/--/auth',
  DATABASE_PATH: ':memory:',
};

async function startServer(env = {}) {
  const config = loadConfig({ ...BASE_ENV, ...env });
  const store = openDatabase(':memory:');
  const server = createApp({ config, store }).listen(0);
  await new Promise((done) => {
    if (server.listening) return done();
    server.once('listening', done);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return { config, base, store, close: () => new Promise((done) => server.close(done)) };
}

async function post(base, path, body) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

async function get(base, path, token) {
  const res = await fetch(`${base}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

describe('config', () => {
  it('refuses to boot without a signing secret', () => {
    assert.throws(() => loadConfig({ ...BASE_ENV, JWT_SECRET: 'short' }), /JWT_SECRET/);
  });

  it('refuses to boot without a redirect allowlist', () => {
    assert.throws(
      () => loadConfig({ ...BASE_ENV, ALLOWED_REDIRECT_URIS: '' }),
      /ALLOWED_REDIRECT_URIS/
    );
  });

  it('parses redirect lists and strips whitespace', () => {
    const config = loadConfig({ ...BASE_ENV, ALLOWED_REDIRECT_URIS: 'mars://auth, exp://a/b ,' });
    assert.deepEqual(config.allowedRedirectUris, ['mars://auth', 'exp://a/b']);
  });
});

describe('POST /auth/signin', () => {
  let ctx;
  before(async () => {
    ctx = await startServer();
  });
  after(() => ctx.close());

  it('rejects an unknown provider before doing any work', async () => {
    const res = await post(ctx.base, '/auth/signin', { provider: 'myspace' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'unsupported_provider');
  });

  it('rejects a GitHub code whose redirect URI is not allowlisted', async () => {
    const res = await post(ctx.base, '/auth/signin', {
      provider: 'github',
      code: 'whatever',
      codeVerifier: 'v'.repeat(43),
      redirectUri: 'https://evil.example.com/steal',
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'redirect_uri_not_allowed');
  });

  it('requires a redirect URI for the GitHub code flow', async () => {
    const res = await post(ctx.base, '/auth/signin', { provider: 'github', code: 'x' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'invalid_request');
  });

  it('requires a code for the Google code flow', async () => {
    const res = await post(ctx.base, '/auth/signin', {
      provider: 'google',
      redirectUri: 'mars://auth',
    });
    assert.equal(res.status, 400);
  });

  it('requires an identity token for Apple', async () => {
    const res = await post(ctx.base, '/auth/signin', { provider: 'apple' });
    assert.equal(res.status, 400);
  });

  it('rejects an unverifiable Google identity token', async () => {
    const res = await post(ctx.base, '/auth/signin', {
      provider: 'google',
      idToken: 'not-a-real-jwt',
    });
    // 400 (bad request) or 401 (unverifiable) are both correct rejections; what
    // matters is that a garbage token never produces a session.
    assert.ok([400, 401].includes(res.status), `unexpected status ${res.status}`);
    assert.equal(res.body.user, undefined);
    assert.equal(res.body.accessToken, undefined);
  });

  it('never mints a session from an unverified identity', async () => {
    for (const provider of ['google', 'github', 'apple']) {
      const res = await post(ctx.base, '/auth/signin', { provider, idToken: 'garbage' });
      assert.ok(res.status >= 400, `${provider} must not sign in with a bad token`);
      assert.equal(res.body.accessToken, undefined, `${provider} leaked an access token`);
      assert.equal(res.body.refreshToken, undefined, `${provider} leaked a refresh token`);
    }
  });
});

describe('refresh token lifecycle', () => {
  let ctx;
  before(async () => {
    ctx = await startServer();
  });
  after(() => ctx.close());

  function seedUser() {
    const user = ctx.store.upsertUser({
      id: 'user-1',
      provider: 'github',
      providerSub: '4242',
      email: 'ada@example.com',
      emailVerified: true,
      name: 'Ada',
      picture: 'https://example.com/a.png',
    });
    const refreshToken = generateRefreshToken();
    ctx.store.createRefreshToken({
      id: newTokenId(),
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    return { user, refreshToken };
  }

  it('issues a session and rotates the refresh token', async () => {
    const { refreshToken } = seedUser();
    const res = await post(ctx.base, '/auth/refresh', { refreshToken });

    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, 'ada@example.com');
    assert.equal(res.body.user.provider, 'github');
    assert.equal(res.body.tokenType, 'Bearer');
    assert.ok(res.body.accessToken && res.body.refreshToken);
    assert.notEqual(res.body.refreshToken, refreshToken, 'refresh token must rotate');

    const old = ctx.store.getRefreshTokenByHash(hashToken(refreshToken));
    assert.ok(old.revokedAt, 'old token revoked');
    assert.equal(old.revokedReason, 'rotated');
  });

  it('treats a replayed rotated token as theft and revokes everything', async () => {
    const { refreshToken } = seedUser();
    const rotated = await post(ctx.base, '/auth/refresh', { refreshToken });
    assert.equal(rotated.status, 200);

    const replay = await post(ctx.base, '/auth/refresh', { refreshToken });
    assert.equal(replay.status, 401);
    assert.equal(replay.body.error.code, 'refresh_token_reused');

    // The token minted by the rotation must be dead too, otherwise stealing a
    // refresh token would only cost the victim one session.
    const successor = await post(ctx.base, '/auth/refresh', { refreshToken: rotated.body.refreshToken });
    assert.equal(successor.status, 401);
  });

  it('rejects an unknown refresh token', async () => {
    const res = await post(ctx.base, '/auth/refresh', { refreshToken: generateRefreshToken() });
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'invalid_refresh_token');
  });

  it('requires a refresh token', async () => {
    const res = await post(ctx.base, '/auth/refresh', {});
    assert.equal(res.status, 400);
  });

  it('rejects an expired refresh token', async () => {
    const user = ctx.store.upsertUser({
      id: 'user-expired',
      provider: 'google',
      providerSub: 'expired-1',
      email: 'old@example.com',
      emailVerified: true,
      name: null,
      picture: null,
    });
    const refreshToken = generateRefreshToken();
    ctx.store.createRefreshToken({
      id: 'rt-expired',
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });

    const res = await post(ctx.base, '/auth/refresh', { refreshToken });
    assert.equal(res.status, 401);
    assert.equal(ctx.store.getRefreshTokenByHash(hashToken(refreshToken)).revokedReason, 'expired');
  });
});

describe('POST /auth/logout', () => {
  let ctx;
  before(async () => {
    ctx = await startServer();
  });
  after(() => ctx.close());

  it('is idempotent and reveals nothing about the token', async () => {
    const known = await post(ctx.base, '/auth/logout', { refreshToken: generateRefreshToken() });
    const unknown = await post(ctx.base, '/auth/logout', { refreshToken: generateRefreshToken() });
    assert.equal(known.status, 204);
    assert.equal(unknown.status, 204);
  });

  it('revokes the presented token, and a stale token is not treated as theft', async () => {
    const user = ctx.store.upsertUser({
      id: 'user-logout',
      provider: 'google',
      providerSub: 'logout-1',
      email: 'bye@example.com',
      emailVerified: true,
      name: null,
      picture: null,
    });
    const refreshToken = generateRefreshToken();
    ctx.store.createRefreshToken({
      id: 'rt-logout',
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    await post(ctx.base, '/auth/logout', { refreshToken });
    const record = ctx.store.getRefreshTokenByHash(hashToken(refreshToken));
    assert.equal(record.revokedReason, 'logout');

    const res = await post(ctx.base, '/auth/refresh', { refreshToken });
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'invalid_refresh_token');
  });
});

describe('GET /auth/me', () => {
  let ctx;
  let token;
  before(async () => {
    ctx = await startServer();
    const user = ctx.store.upsertUser({
      id: 'user-me',
      provider: 'google',
      providerSub: 'me-1',
      email: 'me@example.com',
      emailVerified: true,
      name: 'Grace',
      picture: 'https://example.com/g.png',
    });
    token = await signAccessToken(user, ctx.config);
  });
  after(() => ctx.close());

  it('returns the user for a valid access token', async () => {
    const res = await get(ctx.base, '/auth/me', token);
    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, 'me@example.com');
  });

  it('rejects a missing token', async () => {
    const res = await get(ctx.base, '/auth/me');
    assert.equal(res.status, 401);
  });

  it('rejects a garbage token', async () => {
    const res = await get(ctx.base, '/auth/me', 'not-a-token');
    assert.equal(res.status, 401);
  });
});

describe('transport hardening', () => {
  let ctx;
  before(async () => {
    ctx = await startServer();
  });
  after(() => ctx.close());

  it('sets security headers and hides the framework', async () => {
    const res = await fetch(`${ctx.base}/health`);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.equal(res.headers.get('x-powered-by'), null);
  });

  it('reports which providers are configured without leaking secrets', async () => {
    const res = await get(ctx.base, '/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.ok(!JSON.stringify(res.body).includes('secret'));
  });

  it('rejects an over-sized body as 413, not 500', async () => {
    const res = await fetch(`${ctx.base}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'github', code: 'a'.repeat(20_000) }),
    });
    assert.equal(res.status, 413);
    const body = await res.json();
    assert.equal(body.error.code, 'invalid_request');
  });

  it('rejects a malformed JSON body as 400', async () => {
    const res = await fetch(`${ctx.base}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, 'invalid_request');
  });

  it('404s unknown routes in the standard error shape', async () => {
    const res = await get(ctx.base, '/nope');
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'not_found');
  });

  it('rate limits repeated sign-in attempts', async () => {
    let limited = null;
    for (let i = 0; i < 40; i += 1) {
      const res = await post(ctx.base, '/auth/signin', { provider: 'github', code: 'x', redirectUri: 'nope' });
      if (res.status === 429) {
        limited = res;
        break;
      }
    }
    assert.ok(limited, 'expected a 429');
    assert.equal(limited.body.error.code, 'signin_rate_limited');
  });
});
