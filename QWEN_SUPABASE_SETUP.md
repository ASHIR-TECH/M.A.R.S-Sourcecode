# Qwen (DashScope) Setup for Supabase Edge Functions

This is a clean setup you can give to Supabase AI (or paste into the Supabase dashboard) to create `qwen-chat` function properly.

## Goal
Create `supabase/functions/qwen-chat/index.ts` that proxies to Qwen (DashScope) OpenAI-compatible API, keeps API key server-side, and works with your mobile app.

## Prerequisites
- Supabase project: `yiaknrtvtgtmbgzhdlru`
- DashScope API key from https://dashscope.console.aliyun.com/apiKey
- Secrets to add: `DASHSCOPE_API_KEY` (required). Optional: `QWEN_MODEL`, `QWEN_MAX_TOKENS`, `QWEN_TEMPERATURE`

## 1) Create the function file

Create file: `supabase/functions/qwen-chat/index.ts`

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const DASHSCOPE_API_KEY = Deno.env.get("DASHSCOPE_API_KEY");
    const QWEN_MODEL = Deno.env.get("QWEN_MODEL") ?? "qwen-plus";
    const QWEN_MAX_TOKENS = Number(Deno.env.get("QWEN_MAX_TOKENS") ?? "2048");
    const QWEN_TEMPERATURE = Number(Deno.env.get("QWEN_TEMPERATURE") ?? "0.2");

    if (!DASHSCOPE_API_KEY) return jsonResponse({ error: "Qwen not configured" }, 500);

    const body = await req.json().catch(() => ({} as any));
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const userText = typeof body?.text === "string" ? body.text : "";
    const context = typeof body?.context === "string" ? body.context : "";

    const finalMessages =
      messages.length > 0
        ? messages
        : [
            {
              role: "system",
              content:
                "You are Mars, a terse assistant for a desktop/device command-center app. Scope: paired desktops, connected nodes, device stats (CPU, RAM, OS, status, uptime), troubleshooting those only. Refuse all other topics in one short sentence. No chit-chat, no preamble/summary, max 3 sentences or one table.",
            },
            { role: "user", content: context ? `${context}\n\n${userText}` : userText },
          ];

    const upstream = await fetch("https://dashscope.aliyun.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: QWEN_MODEL,
        messages: finalMessages,
        temperature: QWEN_TEMPERATURE,
        max_tokens: QWEN_MAX_TOKENS,
      }),
    });

    const data = await upstream.json().catch(() => ({} as any));
    if (!upstream.ok) return jsonResponse({ error: "Upstream error", details: data }, upstream.status);

    const reply = data?.choices?.[0]?.message?.content ?? "";
    return jsonResponse({ reply, model: QWEN_MODEL, usage: data?.usage ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: "Function error", message: msg }, 500);
  }
});
```

## 2) Create deno.json (optional but nice)

File: `supabase/functions/qwen-chat/deno.json`

```json
{
  "imports": {}
}
```

## 3) Set secrets in Supabase

Add these as Edge Function Secrets (Project Settings → Edge Functions → Secrets):

| Name | Required | Value |
|---|---|---|
| `DASHSCOPE_API_KEY` | Yes | `sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `QWEN_MODEL` | No | `qwen-plus` (or `qwen-max`, `qwen-turbo`) |
| `QWEN_MAX_TOKENS` | No | `2048` |
| `QWEN_TEMPERATURE` | No | `0.2` |

## 4) Deploy

Deploy the function. After deploy, it will be available at:
`https://yiaknrtvtgtmbgzhdlru.supabase.co/functions/v1/qwen-chat`

## 5) Test (curl)

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"text": "List paired devices in one line"}' \
  https://yiaknrtvtgtmbgzhdlru.supabase.co/functions/v1/qwen-chat
```

## 6) Mobile integration

Point the app to call this URL instead of relay's `/fallback-chat` or update relay to proxy to it. For "all users share key" (centralized), this is correct. If you want per-user auth gating, forward `Authorization: Bearer <supabase_access_token>` from app.
