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

// Phase 11 — Flutterwave donations. The secret key and webhook hash must live
// here (relay/.env), never in the mobile bundle.
const FLUTTERWAVE_SECRET_KEY = envVars.FLUTTERWAVE_SECRET_KEY;
const FLUTTERWAVE_WEBHOOK_SECRET_HASH = envVars.FLUTTERWAVE_WEBHOOK_SECRET_HASH;

// Phase 12 — fallback (quick-response) chat. The Groq key is server-only; the
// mobile app never sees it (same reasoning as the Flutterwave secret key).
const GROQ_API_KEY = envVars.GROQ_API_KEY;
const GROQ_MODEL = envVars.GROQ_MODEL || 'openai/gpt-oss-120b';
const FALLBACK_DAILY_LIMIT = Number(envVars.FALLBACK_DAILY_LIMIT || 50);
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const app = express();
app.use(cors());
app.use(express.json());

// Phase 11 — confirmed-donation store (in-memory). Replace with a real DB
// (SQLite/Postgres) before production; this keeps the phase testable locally.
const confirmations = new Map();

// Phase 12 — per-device fallback-chat usage for the daily cap. In-memory as
// well; swap for Redis/DB before scaling past a single instance.
const fallbackUsage = new Map();

function utcDayKey() {
  return new Date().toISOString().slice(0, 10);
}

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

/**
 * POST /verify-transaction
 * Contract expected by the app (donationApi.ts):
 *   body    { txRef }
 *   success { verified, amount, currency, txRef }
 * The app never calls Flutterwave directly — this endpoint re-checks the
 * transaction against Flutterwave using the secret key, so a client-side
 * "success" callback can't be faked by the app on its own.
 */
app.post('/verify-transaction', async (req, res) => {
  const { txRef } = req.body || {};

  if (!txRef) {
    return res.status(400).json({ verified: false, message: 'Missing txRef' });
  }

  if (!FLUTTERWAVE_SECRET_KEY) {
    return res.status(500).json({ verified: false, message: 'Flutterwave not configured on server (FLUTTERWAVE_SECRET_KEY)' });
  }

  try {
    const lookup = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
      { headers: { Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}` } }
    );
    const data = await lookup.json();

    const isSuccessful = data?.status === 'success' && data?.data?.status === 'successful';

    if (!isSuccessful) {
      return res.json({ verified: false, message: 'Transaction not confirmed.' });
    }

    // Persist the confirmed donation so /donation-history can read it back.
    const donation = {
      txRef,
      amount: data.data.amount,
      currency: data.data.currency,
      email: data.data.customer?.email ?? null,
      confirmedAt: new Date().toISOString(),
    };
    confirmations.set(txRef, donation);

    return res.json({
      verified: true,
      amount: data.data.amount,
      currency: data.data.currency,
      txRef,
    });
  } catch (err) {
    console.error('[relay] verify error:', err && err.message ? err.message : String(err));
    return res.status(500).json({ verified: false, message: 'Verification request failed.' });
  }
});

/**
 * POST /flutterwave-webhook
 * Authoritative async source of truth (Phase 11 §1): Flutterwave signs these
 * with a webhook secret hash before they reach us, so the app crashing mid-flow
 * can still confirm the donation server-side.
 */
app.post('/flutterwave-webhook', express.json(), (req, res) => {
  const signature = req.headers['verif-hash'];

  if (!signature || signature !== FLUTTERWAVE_WEBHOOK_SECRET_HASH) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.body;

  if (event.event === 'charge.completed' && event.data.status === 'successful') {
    const txRef = event.data.tx_ref;
    if (txRef) {
      const donation = {
        txRef,
        amount: event.data.amount,
        currency: event.data.currency,
        email: event.data.customer?.email ?? null,
        confirmedAt: new Date().toISOString(),
      };
      confirmations.set(txRef, donation);
      console.log(`[relay] webhook confirmed donation ${txRef}`);
    }
  }

  res.sendStatus(200);
});

/**
 * GET /donation-history
 * Donations made by a given email (FR-7). Sourced from the relay's in-memory
 * store — replace with a real persistence layer before relying on it in prod.
 */
app.get('/donation-history', (req, res) => {
  const email = String(req.query.email || '');
  if (!email) return res.status(400).json({ error: 'Missing email' });

  const donations = Array.from(confirmations.values())
    .filter((d) => d.email === email)
    .sort((a, b) => (a.confirmedAt < b.confirmedAt ? 1 : -1));

  res.json({ donations });
});

/**
 * Turns the app-level snapshot (paired desktop + visible devices) into a compact
 * system prompt so quick-response mode can answer questions about them. Context
 * is read-only descriptive data — never executed, never trusted as instructions.
 */
function buildFallbackMessages(text, context) {
  const lines = [];
  if (context && typeof context === 'object') {
    const desktop = context.pairedDesktop;
    if (desktop && typeof desktop.name === 'string' && desktop.name) {
      const id = typeof desktop.id === 'string' && desktop.id ? ` (${desktop.id})` : '';
      lines.push(`Paired desktop: ${desktop.name}${id}.`);
    }

    const devices = Array.isArray(context.devices) ? context.devices.slice(0, 50) : [];
    if (devices.length) {
      lines.push('Devices/nodes visible in the app:');
      for (const d of devices) {
        if (!d || typeof d !== 'object') continue;
        const metrics = [];
        if (typeof d.cpu === 'number') metrics.push(`cpu ${d.cpu}%`);
        if (typeof d.ram === 'number') metrics.push(`ram ${d.ram}%`);
        lines.push(
          `- ${d.name || 'Unnamed'} [${d.id || '?'}] ${d.os || 'unknown OS'}, ` +
            `status ${d.status || 'unknown'}, last seen ${d.lastSeen || 'unknown'}` +
            (metrics.length ? `, ${metrics.join(', ')}` : '')
        );
      }
    } else {
      lines.push('No devices are currently visible in the app.');
    }
  }

  const system =
    'You are MARS Co-Pilot, a concise assistant inside the MARS app. ' +
    "You may be given a live snapshot of the user's paired desktop and their node/device list. " +
    'Use it when relevant and answer directly. Never invent devices that are not in the snapshot; ' +
    'if asked about something not listed, say you do not have that information.' +
    (lines.length ? `\n\nCurrent app snapshot:\n${lines.join('\n')}` : '');

  return [
    { role: 'system', content: system },
    { role: 'user', content: text },
  ];
}

/**
 * POST /fallback-chat
 * Contract expected by the app (fallbackChatClient.ts):
 *   body    { deviceId, text, context? }
 *   success { reply, providerLabel }
 * Quick-response mode used when no desktop is paired/reachable (PHASE_12).
 * The Groq key stays server-side, and the per-device daily cap is enforced
 * here (not client-side, which would be trivially bypassed) — PHASE_12 §8.
 */
app.post('/fallback-chat', async (req, res) => {
  const { deviceId, text, context } = req.body || {};

  if (!deviceId || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Missing deviceId or text' });
  }

  if (!GROQ_API_KEY) {
    return res
      .status(500)
      .json({ error: 'Fallback chat not configured on server (GROQ_API_KEY)' });
  }

  const day = utcDayKey();
  const usage = fallbackUsage.get(deviceId);
  const usedToday = usage && usage.day === day ? usage.count : 0;

  if (usedToday >= FALLBACK_DAILY_LIMIT) {
    return res.status(429).json({
      error: 'Rate limit reached',
      message: "You've reached today's quick-response limit. Pair a desktop or try again tomorrow.",
    });
  }

  // Count the attempt before calling upstream so failed/abusive requests still
  // consume budget.
  fallbackUsage.set(deviceId, { day, count: usedToday + 1 });

  try {
    const groq = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: buildFallbackMessages(text, context),
      }),
    });

    const data = await groq.json();
    const reply = data?.choices?.[0]?.message?.content;

    if (!groq.ok || !reply) {
      console.error('[relay] fallback groq error:', JSON.stringify(data).slice(0, 300));
      return res.status(502).json({ error: 'Upstream chat failed' });
    }

    return res.json({ reply, providerLabel: 'Groq' });
  } catch (err) {
    console.error('[relay] fallback error:', err && err.message ? err.message : String(err));
    return res.status(502).json({ error: 'Fallback chat request failed.' });
  }
});

/** GET /health - liveness + config report (no secrets). */
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    githubConfigured: !!(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET),
    flutterwaveConfigured: !!FLUTTERWAVE_SECRET_KEY,
    fallbackChatConfigured: !!GROQ_API_KEY,
    publicUrl: PUBLIC_URL,
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'M.A.R.S backend relay',
    health: '/health',
    github: 'POST /auth/github',
    donations: {
      verify: 'POST /verify-transaction',
      webhook: 'POST /flutterwave-webhook',
      history: 'GET /donation-history?email=...',
    },
    chat: {
      fallback: 'POST /fallback-chat',
    },
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
  console.log(`[relay] Flutterwave secret key:\t${FLUTTERWAVE_SECRET_KEY ? 'configured' : 'MISSING (relay/.env)'}`);
  console.log(`[relay] Flutterwave webhook hash:\t${FLUTTERWAVE_WEBHOOK_SECRET_HASH ? 'configured' : 'MISSING (relay/.env)'}`);
  console.log(`[relay] Groq fallback key:\t${GROQ_API_KEY ? 'configured' : 'MISSING (relay/.env)'}`);
  console.log(`[relay] edit mobile/.env, then ${''}reload the app (bundle re-inlines EXPO_PUBLIC_* vars)`);
  console.log(`[relay] self-check: curl http://localhost:${PORT}/health`);
});