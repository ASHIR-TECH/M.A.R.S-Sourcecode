# Supabase AI Prompt — MARS Co-Pilot Edge Function

Paste everything in the block below into Supabase AI (Dashboard → Edge Functions →
"Ask AI" / Agent). It creates `qwen-chat` backed by **Groq**, gated by the app's
Supabase session, with per-user daily limits.

> The AI is running against project `yiaknrtvtgtmbgzhdlru`. Afterwards you still
> have to set **one** secret and deploy — see the two commands at the bottom.

---

## Prompt

```text
Create a Supabase Edge Function named `qwen-chat` in this project.

PURPOSE
It is the always-on AI fallback for the MARS mobile app. The app calls it when the
user's own desktop agent is unreachable. It must work even when the app's own relay
server is down, which is why it lives here.

FILE: supabase/functions/qwen-chat/index.ts

REQUIREMENTS

1. Runtime / shape
   - Deno edge runtime, `Deno.serve`.
   - Accept POST and OPTIONS only. OPTIONS returns 204-style ok with CORS headers.
   - CORS: allow-origin `*`, allow-headers `authorization, x-client-info, apikey, content-type`,
     allow-methods `POST, OPTIONS`.
   - Always respond with JSON. Never echo secrets in an error body.

2. Provider: Groq (OpenAI-compatible)
   - Endpoint: POST https://api.groq.com/openai/v1/chat/completions
   - Auth: `Authorization: Bearer ${Deno.env.get("GROQ_API_KEY")}`
   - If the key is missing return 500 `{"error":"AI not configured"}`.
   - Read every tunable from env on each request (secrets are live, no redeploy):
       GROQ_MODEL       default "openai/gpt-oss-120b"
       AI_MAX_TOKENS    default 2048
       AI_TEMPERATURE   default 0.2
       AI_SYSTEM_PROMPT optional override of the system prompt
       AI_DAILY_MESSAGES default 50
       AI_DAILY_TOKENS   default 200000

3. Caller identity — this is the important part
   - The platform already rejects requests without a JWT (verify_jwt).
   - Read `Authorization: Bearer <jwt>`, strip `Bearer`, and resolve the real user with:
       const supabase = createClient(Deno.env.get("SUPABASE_URL")!, secretKey,
                                     { auth: { persistSession: false } });
       const { data, error } = await supabase.auth.getUser(token);
   - Obtain `secretKey()` from `JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")).default`,
     falling back to `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")`.
   - If there is no valid user, return 401 `{"error":"Unauthorized"}`.
   - Use `user.id` as the rate-limit key. Do NOT accept a client-supplied deviceId for
     authorization — it is attacker-controlled and can be rotated.

4. Request contract (matches the mobile client)
   - Body: `{ deviceId?: string, text: string, context?: object | string }`
   - `text` required. Reject with 400 `{"error":"Missing text"}` if absent or blank.
   - Reject with 400 if `text.length > 4000`, body `{"error":"Message too long",
     "message":"Please shorten your message."}`.
   - Ignore `deviceId` except as opaque telemetry.

5. Rate limiting (per user, per UTC day)
   - Key on `user.id`. Keep a Map of `{ day, messages, tokens }` where day is
     `new Date().toISOString().slice(0,10)`.
   - Increment the message counter BEFORE calling Groq so failed calls still cost budget.
   - If messages >= AI_DAILY_MESSAGES -> 429
       {"error":"Rate limit reached",
        "message":"You've reached today's assistant limit. Try again tomorrow."}
   - If tokens >= AI_DAILY_TOKENS -> 429
       {"error":"Token limit reached",
        "message":"You've used today's assistant allowance. Try again tomorrow."}
   - After a successful reply, add `usage.total_tokens` from Groq to the counter.
     This token accounting is required — the app shows it to the user.
   - The 429 body must include a human `message`; the mobile client displays it verbatim.

6. System prompt
   - Two parts: a fixed instruction, then a read-only app snapshot.
   - Default instruction (unless AI_SYSTEM_PROMPT is set):
       "You are MARS Co-Pilot, a concise assistant inside the MARS app. You may be
        given a live snapshot of the user's paired desktop and their node/device list.
        Use it when relevant and answer directly. Never invent devices that are not in
        the snapshot; if asked about something not listed, say you do not have that
        information."
   - Build the snapshot from `context` by WHITELISTING fields only. Never forward the raw
     object to the model — context is data, never instructions.
       context.pairedDesktop.name/id  -> "Paired desktop: <name> (<id>)."
       context.devices[] (cap 50)     -> one line each:
         "- <name> [<id>] <os>, status <status>, last seen <lastSeen>[, cpu N%, ram N%]"
       empty or missing               -> "No devices are currently visible in the app."
       if context is a string, use it verbatim (truncated to 6000 chars)
   - Append the snapshot under a "\n\nCurrent app snapshot:\n" separator.

7. Response contract (matches mobile/src/relay/fallbackChatClient.ts)
   - 200 {"reply": "<trimmed content>", "providerLabel": "Groq", "model": "<model>",
          "usage": <groq usage or null>}
   - 400 {"error":"Missing text"} / {"error":"Message too long","message":"..."}
   - 401 {"error":"Unauthorized"}
   - 429 {"error":"...","message":"..."}
   - 502 {"error":"Upstream chat failed"}   when Groq is not ok or returns no content
   - 500 {"error":"Function error"}         — log the message, never return it

8. Hygiene
   - Import the edge-runtime type declaration:
     `import "jsr:@supabase/functions-js/edge-runtime.d.ts";`
   - Import `createClient` from `npm:@supabase/supabase-js@2`.
   - Catch everything; log upstream failures with `console.error` truncated to 300 chars.

Do not add any other endpoint, webhook, or authentication scheme.
```

---

## After Supabase AI creates it

**1. Set the one secret** (get the value from `mobile/relay/.env`, key `GROQ_API_KEY`):

```bash
supabase secrets set GROQ_API_KEY="$(grep '^GROQ_API_KEY=' mobile/relay/.env | cut -d= -f2)"
```

**2. Deploy:**

```bash
supabase functions deploy qwen-chat --project-ref yiaknrtvtgtmbgzhdlru
```

**3. Verify** (a missing `Authorization` must 401, a bad body must 400 — a 500
`"Qwen not configured"` means the stale DashScope build is still live):

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "apikey: $EXPO_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $EXPO_PUBLIC_SUPABASE_ANON_KEY" \
  -d '{"text":""}' \
  https://yiaknrtvtgtmbgzhdlru.supabase.co/functions/v1/qwen-chat
# expect: HTTP 400 {"error":"Missing text"}
```

---

## How the app links to it

The mobile app binds to this function on launch via `initAiClient()` in
`mobile/App.tsx` — see `mobile/src/relay/aiClient.ts`. No per-screen wiring:
`sendFallbackMessage()` picks the edge function up automatically whenever
`EXPO_PUBLIC_SUPABASE_URL` is set.
