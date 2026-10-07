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

    const upstream = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
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
