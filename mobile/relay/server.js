const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
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
 *
 * Values may be wrapped in single or double quotes and span multiple lines
 * (needed for FALLBACK_SYSTEM_PROMPT): the parser keeps reading until the
 * closing quote. \n and \" escapes inside quoted values are unescaped.
 */
function loadEnvFile(filePath) {
  const vars = {};
  if (!fs.existsSync(filePath)) return vars;
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!key) continue;

    let raw = trimmed.slice(eq + 1).trim();
    const quote = raw[0];
    const isQuoted = quote === '"' || quote === "'";

    if (isQuoted && !(raw.length > 1 && raw.endsWith(quote))) {
      const parts = [raw.slice(1)];
      while (i + 1 < lines.length) {
        i += 1;
        const next = lines[i];
        if (next.trimEnd().endsWith(quote)) {
          parts.push(next.trimEnd().slice(0, -1));
          break;
        }
        parts.push(next);
      }
      raw = parts.join('\n').replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\'/g, "'");
    } else if (isQuoted) {
      raw = raw.slice(1, -1);
    }

    vars[key] = raw;
  }
  return vars;
}

// Merged env: the app-level .env (tunnel URL) plus the relay-level .env
// (donation + chat secrets), relay values win.
const envVars = {
  ...loadEnvFile(path.resolve(__dirname, '..', '.env')),
  ...loadEnvFile(path.resolve(__dirname, '.env')),
  ...process.env,
};

const PUBLIC_URL = envVars.RELAY_PUBLIC_URL || '';
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
// Optional override for the quick-response coach prompt/guardrails. Set
// FALLBACK_SYSTEM_PROMPT in relay/.env to change the assistant's tone and rules
// without touching code; the app snapshot is still appended underneath.
const FALLBACK_SYSTEM_PROMPT = envVars.FALLBACK_SYSTEM_PROMPT;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Supabase project used to check the caller's session. The anon key is designed
// to be public; only the user's signed-in JWT proves who is calling, and it is
// verified below before /fallback-chat spends any quota.
const SUPABASE_URL = envVars.SUPABASE_URL || envVars.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = envVars.SUPABASE_ANON_KEY || envVars.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Comma-separated browser origins allowed to call this relay. Native builds send
// no Origin header and are always allowed; browsers must be listed explicitly.
const CORS_ALLOWED_ORIGINS = (envVars.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

// Optional shared secret that gates /donation-history. When unset the endpoint
// is disabled entirely (it exposes donation PII and has no other auth).
const RELAY_ADMIN_TOKEN = envVars.RELAY_ADMIN_TOKEN;

const app = express();
// The real client IP arrives in X-Forwarded-For (added by the tunnel in front
// of us), but only when the request actually came from that tunnel. Honour
// X-Forwarded-For only for a trusted proxy (loopback by default -- cloudflared's
// local connector connects from 127.0.0.1; TRUSTED_PROXY_IPS overrides for a
// remote proxy). Any other peer is treated as the client itself, so a direct
// caller can no longer spoof its IP to dodge the rate limiter.
const TRUSTED_PROXY_IPS = (envVars.TRUSTED_PROXY_IPS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.set('trust proxy', (ip) =>
  ['127.0.0.1', '::1', '::ffff:127.0.0.1', ...TRUSTED_PROXY_IPS].includes(ip)
);
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || CORS_ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
  })
);
app.use(express.json({ limit: '64kb' }));

/** Constant-time string comparison so secret checks don't leak via timing. */
function timingSafeEqualStr(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

const devicePresence = new Map(); // deviceId -> {lastSeen: ms, ip: string}

/** Tiny in-memory per-IP + per-route limiter (no dependency). */
const rateBuckets = new Map();
function rateLimit({ windowMs, max }) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > max) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    return next();
  };
}

// Phase 11 — confirmed-donation store (in-memory). Replace with a real DB
// (SQLite/Postgres) before production; this keeps the phase testable locally.
const confirmations = new Map();

// Phase 12 — per-device fallback-chat usage for the daily cap. In-memory as
// well; swap for Redis/DB before scaling past a single instance.
const fallbackUsage = new Map();

function utcDayKey() {
  return new Date().toISOString().slice(0, 10);
}

// Bound the in-memory maps so a long-running relay can't grow without limit.
// confirmations is deliberately left alone: it is the permanent donation ledger,
// not a cache, and only grows with real transactions.
const PRESENCE_TTL_MS = 5 * 60_000; // a device is gone once it misses its heartbeat window
function sweepExpiredState() {
  const now = Date.now();
  const today = utcDayKey();

  for (const [deviceId, record] of devicePresence) {
    if (now - record.lastSeen > PRESENCE_TTL_MS) devicePresence.delete(deviceId);
  }
  for (const [key, bucket] of rateBuckets) {
    if (now > bucket.resetAt) rateBuckets.delete(key);
  }
  for (const [deviceId, usage] of fallbackUsage) {
    if (usage.day !== today) fallbackUsage.delete(deviceId);
  }
}
const sweepTimer = setInterval(sweepExpiredState, 60_000);
sweepTimer.unref();

/**
 * Require a signed-in Supabase session so the chat proxy isn't an open door for
 * anyone who finds the relay's public URL. Asks Supabase Auth to validate the
 * presented JWT; the anon key merely proves the token was minted for this app.
 */
async function verifySupabaseSession(req) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  const header = req.headers.authorization;
  const token = typeof header === 'string' ? header.replace(/^Bearer\s+/i, '').trim() : '';
  if (!token) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Authentication is not handled here.
 *
 * The relay used to expose POST /auth/github, which swapped an OAuth code for
 * a live GitHub access token and handed it to the app. That is gone: it left a
 * provider credential on the device and bypassed any real session handling.
 * Sign-in now runs entirely through Supabase Auth, which exchanges the provider
 * code on its own servers, so this relay never sees an identity.
 */

/**
 * POST /verify-transaction
 * Contract expected by the app (donationApi.ts):
 *   body    { txRef }
 *   success { verified, amount, currency, txRef }
 * The app never calls Flutterwave directly — this endpoint re-checks the
 * transaction against Flutterwave using the secret key, so a client-side
 * "success" callback can't be faked by the app on its own.
 */
app.post('/verify-transaction', rateLimit({ windowMs: 60_000, max: 30 }), async (req, res) => {
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

  if (
    !FLUTTERWAVE_WEBHOOK_SECRET_HASH ||
    typeof signature !== 'string' ||
    !timingSafeEqualStr(signature, FLUTTERWAVE_WEBHOOK_SECRET_HASH)
  ) {
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
  // Disabled unless an admin token is configured: this returns donation PII
  // (email + amount) and has no other authentication.
  if (!RELAY_ADMIN_TOKEN) return res.status(404).json({ error: 'Not found' });
  const provided = req.headers['x-admin-token'];
  if (typeof provided !== 'string' || !timingSafeEqualStr(provided, RELAY_ADMIN_TOKEN)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

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

  const defaultInstruction =
    'You are MARS Co-Pilot, a concise assistant inside the MARS app. ' +
    "You may be given a live snapshot of the user's paired desktop and their node/device list. " +
    'Use it when relevant and answer directly. Never invent devices that are not in the snapshot; ' +
    'if asked about something not listed, say you do not have that information.';

  const instruction = FALLBACK_SYSTEM_PROMPT || defaultInstruction;
  const system = instruction + (lines.length ? `\n\nCurrent app snapshot:\n${lines.join('\n')}` : '');

  return [
    { role: 'system', content: system },
    { role: 'user', content: text },
  ];
}

/**
 * POST /fallback-chat
 * Contract expected by the app (fallbackChatClient.ts):
 *   body    { deviceId, text, context? }  header  Authorization: Bearer <supabase jwt>
 *   success { reply, providerLabel }
 * Quick-response mode used when no desktop is paired/reachable (PHASE_12).
 * The Groq key stays server-side, the per-device daily cap is enforced
 * here (not client-side, which would be trivially bypassed) — PHASE_12 §8,
 * and the caller must present a valid Supabase session so the endpoint isn't
 * open to anyone who discovers the public URL.
 */
app.post('/fallback-chat', rateLimit({ windowMs: 60_000, max: 15 }), async (req, res) => {
  const { deviceId, text, context } = req.body || {};

  if (!deviceId || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Missing deviceId or text' });
  }

  if (!GROQ_API_KEY) {
    return res
      .status(500)
      .json({ error: 'Fallback chat not configured on server (GROQ_API_KEY)' });
  }

  if (!(await verifySupabaseSession(req))) {
    return res.status(401).json({ error: 'Unauthorized' });
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

/** POST /devices/presence - heartbeat from connected devices */
app.post('/devices/presence', rateLimit({ windowMs: 10_000, max: 30 }), (req, res) => {
  const { deviceId } = req.body || {};
  if (!deviceId || typeof deviceId !== 'string') {
    return res.status(400).json({ error: 'Missing deviceId' });
  }
  const ip = (req.ip || req.socket.remoteAddress || '').toString();
  devicePresence.set(deviceId, { lastSeen: Date.now(), ip });
  res.json({ ok: true });
});

/** GET /devices/presence - list connected device presence */
app.get('/devices/presence', rateLimit({ windowMs: 10_000, max: 60 }), (req, res) => {
  const now = Date.now();
  const out = [];
  for (const [deviceId, v] of devicePresence) {
    out.push({ deviceId, lastSeen: v.lastSeen, ago: now - v.lastSeen });
  }
  res.json({ devices: out });
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    flutterwaveConfigured: !!FLUTTERWAVE_SECRET_KEY,
    fallbackChatConfigured: !!GROQ_API_KEY,
    supabaseAuthenticatedChat: !!(SUPABASE_URL && SUPABASE_ANON_KEY),
    publicUrl: PUBLIC_URL,
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'M.A.R.S backend relay',
    health: '/health',
    donations: {
      verify: 'POST /verify-transaction',
      webhook: 'POST /flutterwave-webhook',
      history: 'GET /donation-history?email=...',
    },
    chat: {
      fallback: 'POST /fallback-chat',
    },
    note: 'Sign-in is served by Supabase Auth, not by this relay.',
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[relay] running on http://0.0.0.0:${PORT}`);
  console.log('');
  if (PUBLIC_URL) console.log(`[relay] public URL:  ${PUBLIC_URL}`);
  else console.log('[relay] public URL:  none set - set RELAY_PUBLIC_URL if the app connects from a device');
  console.log('');
  console.log(`[relay] Flutterwave secret key:\t${FLUTTERWAVE_SECRET_KEY ? 'configured' : 'MISSING (relay/.env)'}`);
  console.log(`[relay] Flutterwave webhook hash:\t${FLUTTERWAVE_WEBHOOK_SECRET_HASH ? 'configured' : 'MISSING (relay/.env)'}`);
  console.log(`[relay] Groq fallback key:\t${GROQ_API_KEY ? 'configured' : 'MISSING (relay/.env)'}`);
  console.log(`[relay] self-check: curl http://localhost:${PORT}/health`);
});