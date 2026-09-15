const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// GitHub is slow to connect on some networks and its DNS can hand out a
// NAT64 / IPv6 address that has no route. Talk to GitHub over IPv4 only and
// allow up to 45s for the connect + TLS handshake instead of undici's 10s default.
const { Agent, setGlobalDispatcher } = require('undici');
setGlobalDispatcher(new Agent({ connect: { timeout: 45000, family: 4 } }));

/**
 * Load a KEY=VALUE .env file into an object. Returns {} when the file is
 * missing so every source is optional: the relay works as long as the
 * GitHub client id + secret end up in the merged env.
 */
function loadEnvFile(filePath) {
  const vars = {};
  if (!fs.existsSync(filePath)) return vars;
  const content = fs.readFileSync(filePath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key) vars[key] = value;
  });
  return vars;
}

// Merged env: the app-level .env (EXPO_PUBLIC_GITHUB_CLIENT_ID, tunnel URL)
// plus the relay-level .env (GITHUB_CLIENT_SECRET ...), relay values win.
const envVars = {
  ...loadEnvFile(path.resolve(__dirname, '..', '.env')),
  ...loadEnvFile(path.resolve(__dirname, '.env')),
  ...process.env,
};

const GITHUB_CLIENT_ID = envVars.EXPO_PUBLIC_GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = envVars.GITHUB_CLIENT_SECRET;
const PUBLIC_URL = envVars.EXPO_PUBLIC_AUTH_RELAY_URL || envVars.RELAY_PUBLIC_URL || '';
const PORT = Number(envVars.PORT || 3001);

const app = express();
app.use(cors());
app.use(express.json());

/**
 * POST /auth/github
 * Contract expected by the app (githubAuthProvider.ts):
 *   body    { code, redirectUri, codeVerifier }
 *   success { access_token }
 * The GitHub authorize step already happened in the OS browser and landed
 * the user back on mars://auth; this endpoint only swaps the code for a token.
 */
app.post('/auth/github', async (req, res) => {
  const { code, redirectUri, codeVerifier } = req.body || {};

  console.log('[relay] exchange request -> redirectUri:', redirectUri);
  console.log('[relay] exchange request -> hasCode:', !!code, 'hasCodeVerifier:', !!codeVerifier);

  if (!code || !redirectUri) {
    return res.status(400).json({ error: 'Missing code or redirectUri' });
  }

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return res
      .status(500)
      .json({ error: 'GitHub OAuth not configured on server (EXPO_PUBLIC_GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET)' });
  }

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    const data = await response.json();
    console.log('[relay] GitHub response:', JSON.stringify(data));

    if (data.error) {
      return res.status(401).json({ error: data.error_description || data.error });
    }

    res.json({ access_token: data.access_token });
  } catch (err) {
    console.error('[relay] exchange error:', err && err.message ? err.message : String(err));
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

/** GET /health - liveness + config report (no secrets). */
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    githubConfigured: !!(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET),
    publicUrl: PUBLIC_URL,
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'M.A.R.S auth relay',
    health: '/health',
    github: 'POST /auth/github',
    note: 'Google returns an id_token straight to the app, so Google does not need this relay.',
  });
});

app.listen(PORT, '0.0.0.0', () => {
  const localUrl = `http://10.0.2.2:${PORT}/auth/github`;
  console.log(`[relay] running on http://0.0.0.0:${PORT}`);
  console.log('');
  console.log('[relay] pick ONE of these for EXPO_PUBLIC_AUTH_RELAY_URL in mobile/.env:');
  console.log(`[relay]   local (Android emulator -> host): ${localUrl}`);
  if (PUBLIC_URL) console.log(`[relay]   tunnel (cloudflared etc.):           ${PUBLIC_URL}`);
  else console.log('[relay]   tunnel: none set - start cloudflared and pass its URL as RELAY_PUBLIC_URL or EXPO_PUBLIC_AUTH_RELAY_URL');
  console.log('');
  console.log(`[relay] GitHub client id configured:  ${!!GITHUB_CLIENT_ID}`);
  console.log(`[relay] GitHub client secret:\t${GITHUB_CLIENT_SECRET ? 'configured' : 'MISSING (relay/.env)'}`);
  console.log(`[relay] edit mobile/.env, then ${''}reload the app (bundle re-inlines EXPO_PUBLIC_* vars)`);
  console.log(`[relay] self-check: curl http://localhost:${PORT}/health`);
});