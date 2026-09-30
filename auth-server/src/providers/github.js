import { misconfigured, unauthorized, upstream } from '../errors.js';

const USER_AGENT = 'mars-auth-server';

async function apiRequest(url, accessToken) {
  try {
    return await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': USER_AGENT,
      },
    });
  } catch {
    throw upstream('Could not reach GitHub.');
  }
}

export async function exchangeCode({ config, code, codeVerifier, redirectUri }) {
  const { clientId, clientSecret, tokenEndpoint, apiRoot } = config.providers.github;
  if (!clientId || !clientSecret) {
    throw misconfigured('GitHub sign-in is not configured on this server.');
  }

  let response;
  try {
    response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
      }),
    });
  } catch {
    throw upstream('Could not reach GitHub.');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error || !payload.access_token) {
    throw unauthorized(payload.error_description || 'GitHub rejected the sign-in request.', 'provider_rejected');
  }

  // loadProfile already returns the normalized identity shape.
  return loadProfile(apiRoot, payload.access_token);
}

/**
 * Resolves the GitHub account behind the exchanged token. GitHub only puts an
 * email on /user when the user has a public one, so fall back to the verified
 * address list. The provider token stays on the server and is never returned.
 */
async function loadProfile(apiRoot, accessToken) {
  const profileResponse = await apiRequest(`${apiRoot}/user`, accessToken);
  if (!profileResponse.ok) {
    throw unauthorized('GitHub user profile could not be loaded.', 'provider_rejected');
  }
  const profile = await profileResponse.json();

  let email = profile.email ?? null;
  let emailVerified = Boolean(email);

  if (!email) {
    const emailsResponse = await apiRequest(`${apiRoot}/user/emails`, accessToken);
    if (emailsResponse.ok) {
      const emails = await emailsResponse.json();
      const match = (emails || []).find((entry) => entry.primary && entry.verified)
        || (emails || []).find((entry) => entry.verified);
      if (match) {
        email = match.email;
        emailVerified = true;
      }
    }
  }

  return {
    provider: 'github',
    providerSub: String(profile.id),
    email,
    emailVerified,
    name: profile.name || profile.login || null,
    picture: profile.avatar_url ?? null,
  };
}
