# MARS identity service

The single place where "who is signed in" is decided. The app never decides
that for itself, and it never holds a provider credential.

## Why this exists

Before this service, the app authenticated like this:

- **Google** handed the app a raw `id_token` straight from the browser, and the
  app trusted it. Nothing verified the signature, audience, issuer or expiry, so
  "signed in" was a local flag that any tampered storage entry could satisfy.
- **GitHub** sent its code to a relay endpoint that returned a **live GitHub
  access token**, which the app wrote to SecureStore with `read:user` and
  `user:email` scopes — a long-lived provider credential, not an app session.
- **Apple** returned an identity token that was likewise never verified.
- Each provider produced a *different* shape, so screens had to branch: Google
  had no name, email or avatar, so the UI fell back to initials.

The result: no central identity, no revocation, no audit trail, and three
different notions of "authenticated".

## The flow

The app is a public client using OAuth 2.0 Authorization Code + PKCE. It never
sees a provider secret.

1. The app builds an authorize URL with `state`, a `nonce` it generated, and a
   PKCE challenge, then opens the system browser.
2. The provider redirects back with a single-use `code`.
3. The app posts the grant to `POST /auth/signin`.
4. This service:
   - rejects any `redirectUri` not in `ALLOWED_REDIRECT_URIS`, **before** any
     network call to a provider;
   - exchanges the code (GitHub needs `client_secret`; Google can too);
   - resolves and *verifies* the identity — Google via its published JWKS
     (`RS256`, audience, issuer, nonce), GitHub via `GET /user` plus the
     verified primary address from `GET /user/emails`, Apple via Apple's JWKS;
   - normalizes it to one internal record: `{ id, provider, email,
     emailVerified, name, picture }`;
   - mints **its own** short-lived JWT access token and a rotating refresh
     token, and returns them.
5. The app stores those tokens in SecureStore, confirms the session against
   `GET /auth/me` on launch, refreshes on expiry, and revokes on sign-out.

Google, GitHub and Apple are now interchangeable, and a provider token exists
only in this process's memory during a sign-in.

## Endpoints

| Method | Path          | Purpose                                                  |
| ------ | ------------- | -------------------------------------------------------- |
| `POST` | `/auth/signin`  | Trade a provider grant for `{ user, accessToken, refreshToken, expiresIn }` |
| `POST` | `/auth/refresh` | Rotate the refresh token and return a new session        |
| `POST` | `/auth/logout`  | Revoke a refresh token (`{ allSessions: true }` for all) |
| `GET`  | `/auth/me`     | Validate the access token, return the current user       |
| `GET`  | `/health`      | Liveness plus which providers are configured             |

Errors are uniform: `{ "error": { "code": "refresh_token_reused", "message": "..." } }`.

## Token design

- **Access token** — HS256 JWT, 15 min, stateless, never stored server-side.
  Verified for issuer, audience and expiry; a future `AuthProvider` guard can
  accept it as a bearer token.
- **Refresh token** — 32 random bytes, opaque, **stored only as a SHA-256
  hash**, so a database leak yields no usable sessions. It rotates on every
  use, and the old one is marked `rotated`.
- **Reuse detection** — presenting an already-rotated token means it leaked, so
  *every* session for that user is revoked and the caller gets
  `refresh_token_reused`. A token retired by `logout` or `expired` is merely
  stale and does not trigger that cascade.
- Users are keyed by `(provider, provider_sub)`, so a provider's stable user id
  is the identity — not the email, which can change or be absent.

## Setup

```bash
cd auth-server
cp .env.example .env      # then edit it
npm install
npm start
```

Generate a signing secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

The service **refuses to start** without `JWT_SECRET` (32+ chars) and without
`ALLOWED_REDIRECT_URIS`. An auth service that boots with a missing signing key
or no redirect allowlist is worse than one that will not run.

### Provider setup

For each provider you enable, register **every** URI in `ALLOWED_REDIRECT_URIS`
as an allowed callback/redirect target. Expo's redirect URI varies by how you
launch, so the dev entries must match what `makeRedirectUri()` prints in dev
logs — e.g. `exp://127.0.0.1:8081/--/auth` locally and
`exp://192.168.1.20:8081/--/auth` over LAN. Point the app at the service with
`EXPO_PUBLIC_AUTH_SERVER_URL` (see `mobile/.env.example`); on the Android
emulator that is `http://10.0.2.2:4000`.

## Hardening

- Redirect URI allowlist enforced before any provider request.
- Per-IP rate limits: 20/min on sign-in, 120/min on refresh.
- 16 KB JSON body cap; security headers; `x-powered-by` disabled.
- CORS off unless `CORS_ALLOWED_ORIGINS` is set (native apps send no `Origin`).
- No token, secret or provider payload is ever logged; `Cache-Control:
  no-store` on session responses; client errors never echo internals.
- The relay's old `POST /auth/github` was removed, so there is no longer a
  second, weaker way to obtain a provider token.

## Tests

```bash
npm test
```

Covers config fail-fast, redirect allowlisting, that no provider is trusted
without verification, refresh rotation, reuse detection, logout, expiry,
`/auth/me`, and the transport hardening above.

## Notes for production

- Terminate TLS in front of this service; the access token is a bearer
  credential.
- `TRUST_PROXY_HOPS` must match your real proxy depth, since rate limiting keys
  off `req.ip`.
- The SQLite file is fine for a single instance. Move `src/db.js` to Postgres
  before running more than one replica.
- Rotating `JWT_SECRET` invalidates access tokens; existing refresh tokens
  survive and will mint new ones.
