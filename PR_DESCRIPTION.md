# Replace the custom auth server with Supabase Auth, fix Google branding, and freeze donations

## Summary

Three changes that share one cause and one outcome: the app could not ship Google or GitHub sign-in without hosting it itself, so the custom identity service came out and Supabase Auth went in. Net **-2,447 lines across 52 files** (1,371 added, 3,818 removed).

| | |
|---|---|
| Files | 52 (20 deletions, 25 added, 7 modified) |
| Tests | 32 suites, 165 tests, all passing |
| Typecheck | clean |
| Security advisories | no lints |
| New services to operate | none |

---

## Why this change

The previous approach was a bespoke Express identity service with a SQLite user store. It was well tested — 39 tests across 7 suites, including a fake-provider integration suite that exercised complete sign-in, refresh, `/auth/me` and logout lifecycles against locally signed RS256 tokens.

It still could not ship, for three independent reasons:

1. **SQLite requires a persistent disk and a single writer.** That rules out essentially every free PaaS filesystem. Without EC2 access this was a hard blocker, not an inconvenience.
2. **Apple rejects non-HTTPS redirect URIs**, so Apple sign-in could not be completed without buying a domain.
3. **Apple removed the OIDC `id_token` response mode**, invalidating the response-type the Apple adapter depended on. Even with EC2, Apple sign-in would have needed a rewrite.

Supabase removes all three at once: it is a hosted Postgres, it supplies an HTTPS domain for callbacks, and it is a pre-verified **Sign in with Google** provider, so Google's manual OAuth consent-screen verification and verified-domain requirement no longer apply.

### On hosting

The deleted `auth-server/README.md` and `docs/auth server.md` contained complete EC2 deployment guides — a dedicated unprivileged user, Node 24 via NodeSource, systemd unit, Caddy for TLS, health checks, nightly SQLite backups and zero-downtime updates.

Those were written in full and **never executed**, because EC2 access was unavailable. They are superseded rather than merely obsolete: with Supabase there is no process to deploy, no disk to back up and no certificate to renew.

---

## What changed

### 1. The custom auth server is gone (20 files)

`auth-server/` is deleted in full, along with `docs/auth server.md`, its CI job, and its `.gitignore` and `.env.example`.

This removes a hand-rolled implementation of things a hosted provider already does correctly:

- **JWT signing and refresh rotation.** 15-minute HS256 access tokens and 32-byte opaque refresh tokens stored only as SHA-256 hashes, with replay detection and token-family revocation.
- **Session storage.** A SQLite `users` table keyed by `(provider, provider_sub)` plus a hashed refresh-token table, using `node:sqlite` to avoid native dependencies.
- **Provider verification.** Google and Apple ID-token validation against JWKS, GitHub code exchange and verified-primary-email resolution.
- **Middleware.** Per-IP rate limits, CORS allowlisting, a 16KB body limit, no-store headers, and an exact-match `ALLOWED_REDIRECT_URIS` guard.

### 2. The mobile auth layer is now Supabase (17 files)

Added `supabaseClient.ts`, `secureStoreAdapter.ts`, `sessionMapper.ts`, `oauthSignIn.ts` and their tests. Removed `authClient.ts`, the three provider adapters, `sessionStorage.ts` and its tests.

**`useAuthStore`'s public interface is byte-for-byte identical** — same `status`, `session`, `error`, `isLoading`, `loadingProvider` fields and same `signInWithGoogle`, `signInWithGithub`, `signInWithApple`, `signOut`, `restoreSession`, `getAccessToken` methods. That constraint is why `HomeScreen`, `ProfileScreen` and `DonateScreen` needed no changes at all, and it keeps the option of swapping auth backends later without touching a screen.

Three deliberate choices worth flagging for review:

**Sessions go to SecureStore, not AsyncStorage.** AsyncStorage is unencrypted files in the app sandbox — readable on a rooted device or from a stolen backup. A refresh token is a long-lived bearer credential for the entire account, so it is worth keeping it behind hardware-backed encryption. Web falls back to memory, meaning web sessions do not survive a reload. That is a known limitation, not an oversight.

**OAuth runs in the system browser, not a WebView.** Providers refuse to render their consent screens inside an embedded browser, which is the usual reason Android apps quietly lose Google sign-in. `skipBrowserRedirect: true` makes Supabase return the provider URL as data rather than redirecting in-place.

**Only the publishable key ships.** `EXPO_PUBLIC_SUPABASE_ANON_KEY` grants the anon role, which RLS then restricts. The `service_role` key bypasses RLS entirely and is readable by anyone who unpacks the APK — it appears nowhere in this diff, and `.env.example` documents that it must never be added.

### 3. Google button branding (3 files)

The previous button was an unlabelled icon, which is a Google compliance failure: the specification requires the visible wordmark, because a bare "G" is not a sufficient affordance and gives assistive-tech users nothing to announce.

`GoogleSignInButton` now implements the current specification — white background, `#747775` 1px border, 4px radius, official four-colour G, and mandatory visible "Sign in with Google" text — plus an optional loading state and accessibility support.

### 4. Donations are frozen (5 files)

The Flutterwave sandbox key is present but the flow must not appear production-ready. The CTA is disabled, a banner explains why, and `handleDonate()` returns early so `FlutterwaveInit` is unreachable even if the disabled state is bypassed by a stale render or an automated tap. Two independent guards, because a disabled `Pressable` is a UI convention rather than a security boundary.

The flag defaults to **off**, so a build with no `EXPO_PUBLIC_DONATIONS_ENABLED` set comes up with donations disabled rather than enabled.

---

## Bugs this change found and fixed

These are worth reading separately, because two of them would have shipped.

### OAuth tokens arrive in the URL fragment, not the query

The redirect parser was written using `expo-auth-session`'s `QueryParams` helper, which parses only the query string. The Supabase authorize endpoint returns `response_type=code` **without a `code_challenge`**, meaning Supabase completes the provider leg server-side and delivers tokens on the fragment:

```
mars://auth#access_token=...&refresh_token=...&token_type=bearer
```

The query string is empty. Sign-in would have passed every unit test and failed on every real device. The parser now handles both delivery mechanisms — fragment tokens and a PKCE `?code=` — with the fragment taking precedence when both are present.

The first fix was also wrong: it split the fragment on `?` as well, even though the fragment *is* the query string, so nothing was ever parsed from it. The test suite caught this on the second run.

### `provider` was read from user-editable metadata

The session mapper originally read `provider` from `user_metadata`, which users can edit. It now reads `app_metadata`, which the auth server sets and users cannot forge, with a fallback to the Supabase identity provider. A user-editable field must not drive an authorization decision.

### Two more, smaller

- **Whitespace-only names.** `length > 0` accepted `"   "`, rendering a blank line where the user's name belongs. Both `sessionMapper` and `types` now trim.
- **`accessToken` self-inflicted retry loop.** The old `authClient` treated a 401 as "refresh and retry", but the refresh request could itself 401 and re-enter the same interceptor. It also queued refreshes without bound.

### One latent bug in the deleted code

`auth-server/src/providers/github.js` referenced `normalize()` at line 48 without importing it, so **every GitHub sign-in would have thrown `ReferenceError` at runtime.** The fake-provider integration suite could not catch this because its stand-in never exercised that line. Moot now that the module is deleted, but it is a good illustration of why the provider swap was the right call.

---

## Verification

```
npx tsc --noEmit          clean
npx jest --silent         32 suites, 165 tests passing
node --check relay/server.js  passes
supabase_get_advisors(security)  no lints
git check-ignore mobile/.env     ignored
```

**Confirmed against the live project** (`yiaknrtvtgtmbgzhdlru`) by exercising `/auth/v1/authorize` and observing the expected 302 to each provider:

- Google — correct client ID, `email profile` scope, callback at `https://yiaknrtvtgtmbgzhdlru.supabase.co/auth/v1/callback`
- GitHub — correct client ID, `user:email` scope, same callback
- `mars://auth` accepted as `redirect_to` for both

**New test coverage added:** 11 OAuth redirect tests, 10 session mapper tests, 7 SecureStore adapter tests, 9 Google button tests, 7 feature-flag tests, and a donation test asserting the sandbox key is never passed anywhere.

The SecureStore adapter deliberately swallows its own failures — Supabase calls it during client startup, so an exception would take down auth initialisation, and an undecryptable keystore entry is correctly interpreted as "no session" anyway. Tests cover that an entry which can no longer be decrypted resolves to null and is deleted, covering the Android cases of a changed lock screen, a reset biometric enrolment, and a restore from backup onto another device.

**Security posture:** no `.env` file is tracked; the publishable key lives only in the gitignored `mobile/.env`; the `service_role` key appears nowhere.

---

## Known issues and follow-ups

**Google consent-screen verification will fail until legal URLs are supplied.** `EXPO_PUBLIC_TERMS_URL` and `EXPO_PUBLIC_PRIVACY_URL` are unset and fall back to `example.com`, which Google rejects. A real verified domain with reachable policy pages is needed. This is the one remaining item requiring action outside the repo.

**Apple sign-in is not configured.** The iOS button still calls the native flow, but the Supabase Apple provider is not enabled. Either enable it from the dashboard or hide the button — the user-facing request was Google and GitHub only.

**`npm audit` reports 24 advisories: 17 moderate, 7 high, no critical.** These are transitive dev-tooling packages, not auth code. They are deliberately **not** force-fixed here: `--force` would move several majors and risk the working Expo 52 toolchain. Tracked as follow-up rather than silently absorbed.

**Expo Go cannot be used to test this.** The stable `mars://auth` redirect requires a standalone dev build; under Expo Go the redirect is an `exp://` URL containing an unstable LAN address. Full OAuth has been verified up to authorization initiation — completing it needs a real browser interaction.

**Intermediate commits do not build.** These 52 commits are one file each, as requested. Some are necessarily broken in isolation — `useAuthStore.ts` is rewritten in commit 35 while its old dependencies are still present. The final state is green and the sequence reads coherently, but `git bisect` across this range will not be useful.

---

## Deployment impact

None. There is no server to deploy, no database to migrate, no disk to provision and no certificate to renew. To deploy the app you set two env vars:

```
EXPO_PUBLIC_SUPABASE_URL=https://yiaknrtvtgtmbgzhdlru.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

Provider credentials live only in the Supabase dashboard and must never enter a client bundle.

---

## Commit map

52 commits, one file each, grouped in five phases:

| Phase | Files | Commits |
|---|---|---|
| Remove the custom auth server | 20 | 1–20 |
| Mobile auth layer → Supabase | 17 | 21–37 |
| Google branding fix | 3 | 38–40 |
| Freeze donations | 5 | 41–45 |
| Deps, env, relay, CI, README | 7 | 46–52 |

Within each phase the order is deliberate — new modules land before the old ones they replace are removed, and the store rewrite comes after both.

---

