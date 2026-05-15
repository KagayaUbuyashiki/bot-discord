// Public webhook to receive Discord ticket reports and store them in pending_reports.
// Auth via shared secret header `x-webhook-secret`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-webhook-secret, authorization, apikey",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function getEnv() {
  return {
    url: Deno.env.get("SUPABASE_URL") ?? "",
    serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    secret: Deno.env.get("DISCORD_WEBHOOK_SECRET") ?? "",
  };
}

function admin() {
  const { url, serviceKey } = getEnv();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface ReportBody {
  raw_text?: string;
  stalker_steam_id?: string;
  mission_id?: string;
  attachments?: string[];
  discord_user_id?: string;
  discord_username?: string;
  discord_channel_id?: string;
}

function validate(
  body: unknown,
):
  | { ok: true; data: Required<Pick<ReportBody, "raw_text">> & ReportBody }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "body must be JSON object" };
  const b = body as ReportBody;
  if (!b.raw_text || typeof b.raw_text !== "string")
    return { ok: false, error: "raw_text is required" };
  if (b.raw_text.length > 8000) return { ok: false, error: "raw_text too long (max 8000)" };
  if (b.attachments && (!Array.isArray(b.attachments) || b.attachments.length > 10)) {
    return { ok: false, error: "attachments must be an array (max 10)" };
  }
  return { ok: true, data: b as never };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const env = getEnv();
  const missing = (
    ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "DISCORD_WEBHOOK_SECRET"] as const
  ).filter((k) => !Deno.env.get(k));

  // Health check
  if (req.method === "GET") {
    if (missing.length > 0) {
      return json({ status: "missing_env", missing }, 500);
    }
    const probe = await admin().from("pending_reports").select("id").limit(1);
    return json(
      {
        status: probe.error ? "db_error" : "ok",
        db_error: probe.error?.message ?? null,
        secret_set: Boolean(env.secret),
      },
      probe.error ? 500 : 200,
    );
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (missing.length > 0) {
    return json({ error: "Server misconfigured", missing }, 500);
  }

  const provided = req.headers.get("x-webhook-secret");
  if (provided !== env.secret) {
    return json(
      {
        error: "Unauthorized",
        detail: "PDA_WEBHOOK_SECRET no bot não bate com DISCORD_WEBHOOK_SECRET no backend.",
      },
      401,
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const v = validate(raw);
  if (!v.ok) return json({ error: "Invalid body", detail: v.error }, 400);
  const data = v.data;

  const sb = admin();

  let stalkerId: string | null = null;
  if (data.stalker_steam_id) {
    const { data: st, error } = await sb
      .from("stalkers")
      .select("id")
      .eq("steam_id", data.stalker_steam_id)
      .maybeSingle();
    if (error) {
      return json({ error: "Stalker lookup failed", detail: error.message }, 500);
    }
    stalkerId = st?.id ?? null;
  }

  const { data: inserted, error } = await sb
    .from("pending_reports")
    .insert({
      source: "discord",
      raw_text: data.raw_text,
      stalker_steam_id: data.stalker_steam_id ?? null,
      stalker_id: stalkerId,
      mission_id: data.mission_id ?? null,
      attachments: data.attachments ?? [],
      discord_user_id: data.discord_user_id ?? null,
      discord_username: data.discord_username ?? null,
      discord_channel_id: data.discord_channel_id ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return json({ error: "Insert failed", code: error.code, detail: error.message }, 500);
  }

  return json({ ok: true, id: inserted.id }, 201);
});
