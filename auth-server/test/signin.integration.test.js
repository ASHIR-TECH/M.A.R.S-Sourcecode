/**
 * End-to-end sign-in against a *local* stand-in for Google and GitHub.
 *
 * The point is to exercise the real verification path — a real RS256 JWKS
 * signature check, a real code exchange, a real refresh rotation and a real
 * sign-out — without needing live provider credentials. Only the provider
 * endpoints are redirected; everything else (jose, SQLite, the routes, the
 * hardening) is the production code.
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { openDatabase } from '../src/db.js';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';

const GOOGLE_CLIENT_ID = 'test-google-client.apps.googleusercontent.com';
const GITHUB_CLIENT_ID = 'Iv1.testgithub';
const APPLE_CLIENT_ID = 'com.mars.test';

let provider;
let googleKeys;
let googlePrivateKey;
let githubTokens;
let googleNonce = 'nonce-expected-by-server';

/**
 * Google receives a form-encoded token request while GitHub receives JSON, so
 * honour the content type instead of assuming one. A malformed body must also
 * produce a response rather than throwing out of the handler, which would
 * leave the fetch hanging.
 */
async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return Object.fromEntries(new URLSearchParams(raw));
  }
}

/** Mints a genuinely signed Google id_token, with a controllable nonce/iss/aud. */
async function mintGoogleIdToken(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    email: 'ada@example.com',
    email_verified: true,
    name: 'Ada Lovelace',
    picture: 'https://example.com/ada.png',
    nonce: googleNonce,
    ...overrides,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setSubject(overrides.sub ?? 'google-subject-123')
    .setIssuer(overrides.iss ?? 'https://accounts.google.com')
    .setAudience(overrides.aud ?? GOOGLE_CLIENT_ID)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(googlePrivateKey);
}

function startFakeProviders() {
  const server = http.createServer((req, res) => {
    // Wrapped so an unexpected failure returns a 500 instead of leaving the
    // caller's fetch pending forever.
    handleRequest(req, res).catch(() => {
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'fake provider failure' }));
    });
  });

  return new Promise((done) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      done({ server, base: `http://127.0.0.1:${port}` });
    });
  });
}

async function handleRequest(req, res) {
    const url = new URL(req.url, 'http://localhost');

  // --- Google ---
    if (url.pathname === '/google/token') {
      const body = await readBody(req);
      if (body.code !== 'valid-google-code' || body.code_verifier !== 'good-verifier') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid_grant', error_description: 'bad code or verifier' }));
        return;
      }
      if (body.client_id !== GOOGLE_CLIENT_ID) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid_client' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ access_token: 'ya29.fake', id_token: await mintGoogleIdToken() }));
      return;
    }

    if (url.pathname === '/google/certs') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(googleKeys));
      return;
    }

    // --- GitHub ---
    if (url.pathname === '/github/token') {
      const body = await readBody(req);
      if (body.code !== 'valid-github-code') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'bad_verification_code', error_description: 'code expired' }));
        return;
      }
      if (body.client_secret !== 'github-secret' || body.client_id !== GITHUB_CLIENT_ID) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'incorrect_client_credentials' }));
        return;
      }
      const token = `gho_${githubTokens.push({})}`;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ access_token: token, token_type: 'bearer', scope: 'read:user,user:email' }));
      return;
    }

    if (url.pathname === '/github/user') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id: 4242,
        login: 'ada',
        name: 'Ada Lovelace',
        avatar_url: 'https://example.com/ada.png',
        email: null, // forces the /user/emails fallback
      }));
      return;
    }

    if (url.pathname === '/github/user/emails') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([
        { email: 'unverified@example.com', primary: false, verified: false },
        { email: 'ada@example.com', primary: true, verified: true },
      ]));
      return;
    }

    // --- Apple JWKS ---
    if (url.pathname === '/apple/certs') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(appleKeys));
      return;
    }

    res.writeHead(404).end();
}

let appleKeys;
let applePrivateKey;

async function mintAppleIdentityToken() {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ email: 'grace@example.com', email_verified: 'true' })
    .setProtectedHeader({ alg: 'RS256', kid: 'apple-test-key' })
    .setSubject('apple-subject-abc')
    .setIssuer('https://appleid.apple.com')
    .setAudience(APPLE_CLIENT_ID)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(applePrivateKey);
}

describe('full sign-in lifecycle', () => {
  let ctx;

  before(async () => {
    const google = await generateKeyPair('RS256', { extractable: true });
    googlePrivateKey = google.privateKey;
    googleKeys = { keys: [{ ...(await exportJWK(google.publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' }] };

    const apple = await generateKeyPair('RS256', { extractable: true });
    applePrivateKey = apple.privateKey;
    appleKeys = { keys: [{ ...(await exportJWK(apple.publicKey)), kid: 'apple-test-key', alg: 'RS256', use: 'sig' }] };

    provider = await startFakeProviders();
    githubTokens = [];

    const config = loadConfig({
      JWT_SECRET: 'integration-secret-that-is-long-enough-abc',
      AUTH_ISSUER: 'https://auth.test',
      AUTH_AUDIENCE: 'mars-test',
      ALLOWED_REDIRECT_URIS: 'mars://auth,exp://127.0.0.1:8081/--/auth',
      DATABASE_PATH: ':memory:',
      GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID,
      GITHUB_CLIENT_ID: GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: 'github-secret',
      APPLE_CLIENT_ID: APPLE_CLIENT_ID,
      GOOGLE_JWKS_URI: `${provider.base}/google/certs`,
      APPLE_JWKS_URI: `${provider.base}/apple/certs`,
      GOOGLE_TOKEN_ENDPOINT: `${provider.base}/google/token`,
      GITHUB_TOKEN_ENDPOINT: `${provider.base}/github/token`,
      GITHUB_API_ROOT: `${provider.base}/github`,
    });

    const store = openDatabase(':memory:');
    const server = createApp({ config, store }).listen(0);
    await new Promise((done) => server.listening ? done() : server.once('listening', done));

    // fetch keeps sockets alive, which would make close() hang forever.
    const closeServer = (target) => new Promise((done) => {
      target.closeAllConnections?.();
      target.close(done);
    });

    ctx = {
      config,
      store,
      base: `http://127.0.0.1:${server.address().port}`,
      close: () => closeServer(server).then(() => store.close()),
    };
  });

  after(async () => {
    await ctx.close();
    provider.server.closeAllConnections?.();
    await new Promise((done) => provider.server.close(done));
  });

  const post = (path, body) =>
    fetch(`${ctx.base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(async (res) => ({ status: res.status, body: await res.json().catch(() => null) }));

  it('signs a user in with Google and returns a normalized profile', async () => {
    const res = await post('/auth/signin', {
      provider: 'google',
      code: 'valid-google-code',
      codeVerifier: 'good-verifier',
      redirectUri: 'exp://127.0.0.1:8081/--/auth',
      nonce: 'nonce-expected-by-server',
    });

    assert.equal(res.status, 200);
    assert.deepEqual(res.body.user, {
      id: res.body.user.id,
      provider: 'google',
      email: 'ada@example.com',
      emailVerified: true,
      name: 'Ada Lovelace',
      picture: 'https://example.com/ada.png',
    });
    assert.ok(res.body.accessToken);
    assert.ok(res.body.refreshToken);
    assert.equal(res.body.tokenType, 'Bearer');
    assert.equal(res.body.expiresIn, 900);
  });

  it('never returns the provider token to the app', async () => {
    const res = await post('/auth/signin', {
      provider: 'google',
      code: 'valid-google-code',
      codeVerifier: 'good-verifier',
      redirectUri: 'exp://127.0.0.1:8081/--/auth',
      nonce: 'nonce-expected-by-server',
    });

    const serialized = JSON.stringify(res.body);
    assert.ok(!serialized.includes('ya29.'), 'Google access token leaked');
    assert.ok(!serialized.includes('gho_'), 'GitHub access token leaked');
  });

  it('rejects a Google id_token whose nonce does not match the app', async () => {
    // Simulates replaying a token captured from a different sign-in attempt.
    googleNonce = 'a-different-nonce';
    const res = await post('/auth/signin', {
      provider: 'google',
      code: 'valid-google-code',
      codeVerifier: 'good-verifier',
      redirectUri: 'exp://127.0.0.1:8081/--/auth',
      nonce: 'nonce-expected-by-server',
    });
    googleNonce = 'nonce-expected-by-server';

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'provider_rejected');
  });

  it('rejects an id_token minted for a different app (wrong audience)', async () => {
    const res = await post('/auth/signin', {
      provider: 'google',
      idToken: await mintGoogleIdToken({ aud: 'some-other-app.apps.googleusercontent.com' }),
      nonce: 'nonce-expected-by-server',
    });

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'provider_rejected');
  });

  it('rejects an id_token from an unexpected issuer', async () => {
    const res = await post('/auth/signin', {
      provider: 'google',
      idToken: await mintGoogleIdToken({ iss: 'https://evil.example.com' }),
      nonce: 'nonce-expected-by-server',
    });

    assert.equal(res.status, 401);
  });

  it('rejects a GitHub code the provider will not accept', async () => {
    const res = await post('/auth/signin', {
      provider: 'github',
      code: 'expired-code',
      redirectUri: 'mars://auth',
    });
    assert.equal(res.status, 401);
  });

  it('signs a user in with GitHub and resolves the verified email', async () => {
    const res = await post('/auth/signin', {
      provider: 'github',
      code: 'valid-github-code',
      codeVerifier: 'good-verifier',
      redirectUri: 'mars://auth',
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.user.provider, 'github');
    assert.equal(res.body.user.email, 'ada@example.com', 'should use the verified primary address');
    assert.equal(res.body.user.emailVerified, true);
    assert.equal(res.body.user.name, 'Ada Lovelace');
  });

  it('keeps separate accounts for the same email on different providers', async () => {
    const google = await post('/auth/signin', {
      provider: 'google', code: 'valid-google-code', codeVerifier: 'good-verifier',
      redirectUri: 'mars://auth', nonce: 'nonce-expected-by-server',
    });
    const github = await post('/auth/signin', {
      provider: 'github', code: 'valid-github-code', codeVerifier: 'good-verifier',
      redirectUri: 'mars://auth',
    });

    assert.equal(google.body.user.email, github.body.user.email);
    assert.notEqual(google.body.user.id, github.body.user.id, 'accounts must not be merged on email alone');
  });

  it('signs a user in with Apple and keeps the first-time-only name', async () => {
    const first = await post('/auth/signin', {
      provider: 'apple', idToken: await mintAppleIdentityToken(), name: 'Grace Hopper',
    });
    assert.equal(first.status, 200);
    assert.equal(first.body.user.name, 'Grace Hopper');
    assert.equal(first.body.user.emailVerified, true);

    // Apple omits the name after the first authorization; the stored one must survive.
    const second = await post('/auth/signin', {
      provider: 'apple', idToken: await mintAppleIdentityToken(),
    });
    assert.equal(second.body.user.name, 'Grace Hopper');
  });

  it('rejects an Apple token minted for a different services id', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({ email: 'x@example.com' })
      .setProtectedHeader({ alg: 'RS256', kid: 'apple-test-key' })
      .setSubject('apple-subject-abc')
      .setIssuer('https://appleid.apple.com')
      .setAudience('com.evil.app')
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(applePrivateKey);

    const res = await post('/auth/signin', { provider: 'apple', idToken: token });
    assert.equal(res.status, 401);
  });

  it('validates the access token against GET /auth/me', async () => {
    const signin = await post('/auth/signin', {
      provider: 'github', code: 'valid-github-code', codeVerifier: 'good-verifier',
      redirectUri: 'mars://auth',
    });

    const res = await fetch(`${ctx.base}/auth/me`, {
      headers: { Authorization: `Bearer ${signin.body.accessToken}` },
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).user.provider, 'github');
  });

  it('keeps the user signed in across restarts by rotating the refresh token', async () => {
    const signin = await post('/auth/signin', {
      provider: 'github', code: 'valid-github-code', codeVerifier: 'good-verifier',
      redirectUri: 'mars://auth',
    });

    // 30 days later: the access token is long gone, the refresh token remains.
    const refreshed = await post('/auth/refresh', { refreshToken: signin.body.refreshToken });
    assert.equal(refreshed.status, 200);
    assert.notEqual(refreshed.body.refreshToken, signin.body.refreshToken);

    const me = await fetch(`${ctx.base}/auth/me`, {
      headers: { Authorization: `Bearer ${refreshed.body.accessToken}` },
    });
    assert.equal(me.status, 200);
  });

  it('ends the session everywhere after sign-out', async () => {
    const signin = await post('/auth/signin', {
      provider: 'github', code: 'valid-github-code', codeVerifier: 'good-verifier',
      redirectUri: 'mars://auth',
    });
    const { accessToken, refreshToken } = signin.body;

    const out = await post('/auth/logout', { refreshToken });
    assert.equal(out.status, 204);

    // The stored refresh token is dead...
    const afterLogout = await post('/auth/refresh', { refreshToken });
    assert.equal(afterLogout.status, 401);
    assert.equal(afterLogout.body.error.code, 'invalid_refresh_token');

    // ...and a logout is not treated as theft, so it does not nuke other sessions.
    const other = await post('/auth/signin', {
      provider: 'google', code: 'valid-google-code', codeVerifier: 'good-verifier',
      redirectUri: 'mars://auth', nonce: 'nonce-expected-by-server',
    });
    const otherRefresh = await post('/auth/refresh', { refreshToken: other.body.refreshToken });
    assert.equal(otherRefresh.status, 200, 'an unrelated session must survive a sign-out');

    // The access token remains valid until it expires, which is inherent to
    // stateless JWTs; the refresh path is what actually gates a new session.
    const me = await fetch(`${ctx.base}/auth/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
    assert.equal(me.status, 200);
  });
});
