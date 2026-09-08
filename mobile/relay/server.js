const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// GitHub is slow to connect on some networks and its DNS can hand out a
// NAT64 / IPv6 address that has no route. Talk to GitHub over IPv4 only and
// allow up to 45s for the connect + TLS handshake instead of undici's 10s default.
const { Agent, setGlobalDispatcher } = require('undici');
setGlobalDispatcher(new Agent({ connect: { timeout: 45000, family: 4 } }));

// Load .env from parent directory
const envPath = path.resolve(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...val] = trimmed.split('=');
  envVars[key.trim()] = val.join('=').trim();
});

// Load relay-specific .env (contains GITHUB_CLIENT_SECRET)
const relayEnvPath = path.resolve(__dirname, '.env');
if (fs.existsSync(relayEnvPath)) {
  const relayContent = fs.readFileSync(relayEnvPath, 'utf8');
  relayContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...val] = trimmed.split('=');
    envVars[key.trim()] = val.join('=').trim();
  });
}

const app = express();
app.use(cors());
app.use(express.json());

const GITHUB_CLIENT_ID = envVars.EXPO_PUBLIC_GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = envVars.GITHUB_CLIENT_SECRET;

app.post('/auth/github', async (req, res) => {
  const { code, redirectUri, codeVerifier } = req.body;

  console.log('[relay] exchange request -> redirectUri:', redirectUri);
  console.log('[relay] exchange request -> hasCode:', !!code, 'hasCodeVerifier:', !!codeVerifier);

  if (!code || !redirectUri) {
    return res.status(400).json({ error: 'Missing code or redirectUri' });
  }

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return res.status(500).json({ error: 'GitHub OAuth not configured on server' });
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

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`[relay] GitHub OAuth relay running on http://localhost:${PORT}`);
});
