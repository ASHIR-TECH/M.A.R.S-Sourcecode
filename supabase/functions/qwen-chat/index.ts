import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_TEXT_CHARS = 4000;
const MAX_CONTEXT_DEVICES = 50;
const MAX_CONTEXT_CHARS = 6000;

const dailyUsage = new Map<string, { day: string; messages: number; tokens: number }>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function secretKey(): string {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // fall through to the legacy variable
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

async function resolveUserId(req: Request): Promise<string | null> {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const key = secretKey();
  const url = Deno.env.get("SUPABASE_URL");
  if (!url || !key) return null;

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

function clamp(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

function buildSystemPrompt(context: unknown): string {
  const lines: string[] = [];

  if (context && typeof context === "object") {
    const bag = context as Record<string, unknown>;
    const desktop = bag.pairedDesktop as Record<string, unknown> | undefined;
    if (desktop && typeof desktop.name === "string" && desktop.name) {
      const id = typeof desktop.id === "string" && desktop.id ? ` (${desktop.id})` : "";
      lines.push(`Paired desktop: ${desktop.name}${id}.`);
    }

    const devices = Array.isArray(bag.devices) ? bag.devices.slice(0, MAX_CONTEXT_DEVICES) : [];
    if (devices.length) {
      lines.push("Devices/nodes visible in the app:");
      for (const raw of devices) {
        if (!raw || typeof raw !== "object") continue;
        const d = raw as Record<string, unknown>;
        const metrics: string[] = [];
        if (typeof d.cpu === "number") metrics.push(`cpu ${d.cpu}%`);
        if (typeof d.ram === "number") metrics.push(`ram ${d.ram}%`);
        lines.push(
          `- ${typeof d.name === "string" && d.name ? d.name : "Unnamed"} ` +
            `[${typeof d.id === "string" ? d.id : "?"}] ` +
            `${typeof d.os === "string" ? d.os : "unknown OS"}, ` +
            `status ${typeof d.status === "string" ? d.status : "unknown"}, ` +
            `last seen ${typeof d.lastSeen === "string" ? d.lastSeen : "unknown"}` +
            (metrics.length ? `, ${metrics.join(", ")}` : "")
        );
      }
    } else {
      lines.push("No devices are currently visible in the app.");
    }
  } else if (typeof context === "string" && context.trim()) {
    lines.push(clamp(context.trim(), MAX_CONTEXT_CHARS));
  }

  const instruction =
    Deno.env.get("AI_SYSTEM_PROMPT")?.trim() ||
    "You are MARS Co-Pilot, a concise assistant inside the MARS app. " +
      "You may be given a live snapshot of the user's paired desktop and their node/device list. " +
      "Use it when relevant and answer directly. Never invent devices that are not in the snapshot; " +
      "if asked about something not listed, say you do not have that information.";

  return lines.length ? `${instruction}\n\nCurrent app snapshot:\n${lines.join("\n")}` : instruction;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const apiKey = Deno.env.get("GROQ_API_KEY");
    const model = Deno.env.get("GROQ_MODEL") ?? "openai/gpt-oss-120b";
    const maxTokens = Number(Deno.env.get("AI_MAX_TOKENS") ?? "2048");
    const temperature = Number(Deno.env.get("AI_TEMPERATURE") ?? "0.2");
    const dailyMessages = Number(Deno.env.get("AI_DAILY_MESSAGES") ?? "50");
    const dailyTokens = Number(Deno.env.get("AI_DAILY_TOKENS") ?? "200000");

    if (!apiKey) return jsonResponse({ error: "AI not configured" }, 500);

    const userId = await resolveUserId(req);
    if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return jsonResponse({ error: "Missing text" }, 400);
    if (text.length > MAX_TEXT_CHARS) {
      return jsonResponse({ error: "Message too long", message: "Please shorten your message." }, 400);
    }

    const day = utcDayKey();
    const record = dailyUsage.get(userId);
    const used = record && record.day === day ? record : { day, messages: 0, tokens: 0 };

    if (used.messages >= dailyMessages) {
      return jsonResponse(
        {
          error: "Rate limit reached",
          message: "You've reached today's assistant limit. Try again tomorrow.",
        },
        429
      );
    }
    if (used.tokens >= dailyTokens) {
      return jsonResponse(
        {
          error: "Token limit reached",
          message: "You've used today's assistant allowance. Try again tomorrow.",
        },
        429
      );
    }

    dailyUsage.set(userId, { ...used, messages: used.messages + 1 });

    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: buildSystemPrompt(body.context) },
          { role: "user", content: text },
        ],
      }),
    });

    const data = (await upstream.json().catch(() => ({}))) as Record<string, any>;
    const reply = data?.choices?.[0]?.message?.content ?? "";
    const totalTokens = Number(data?.usage?.total_tokens ?? 0);

    if (!upstream.ok || !reply) {
      console.error("[qwen-chat] upstream error:", JSON.stringify(data).slice(0, 300));
      return jsonResponse({ error: "Upstream chat failed" }, 502);
    }

    if (totalTokens > 0) {
      dailyUsage.set(userId, { day, messages: used.messages + 1, tokens: used.tokens + totalTokens });
    }

    return jsonResponse({ reply: reply.trim(), providerLabel: "Groq", model, usage: data?.usage ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[qwen-chat] error:", msg);
    return jsonResponse({ error: "Function error" }, 500);
  }
});
