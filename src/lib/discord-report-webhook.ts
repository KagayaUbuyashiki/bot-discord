import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Shared handler for the Discord report webhook.
 * Authentication: shared secret via `x-webhook-secret` header.
 */

const bodySchema = z.object({
  type: z.enum(["report", "register", "approval_notification"]).optional().default("report"),
  raw_text: z.string().min(1).max(8000).optional(),
  stalker_steam_id: z.string().max(64).optional(),
  character_name: z.string().max(128).optional(),
  mission_id: z.string().uuid().optional(),
  attachments: z.array(z.string().url().max(2048)).max(10).optional(),
  discord_user_id: z.string().max(64).optional(),
  discord_username: z.string().max(128).optional(),
  discord_channel_id: z.string().max(64).optional(),
  role_assigned: z.string().optional(),
});

export const discordReportCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-webhook-secret",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...discordReportCorsHeaders },
  });
}

function getMissingEnv(): string[] {
  return ["DISCORD_WEBHOOK_SECRET", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter(
    (name) => !process.env[name],
  );
}

function publicInsertError(message: string): string {
  if (message.includes("violates row-level security")) {
    return "A chave de serviço do backend não está bypassando as regras do banco. Verifique SUPABASE_SERVICE_ROLE_KEY no deploy do PDA.";
  }
  if (
    message.includes("schema cache") ||
    (message.includes("Could not find") && message.includes("table"))
  ) {
    return "SUPABASE_URL no deploy do PDA aponta pro projeto Supabase ERRADO (banco vazio). Abra /api/public/discord-report/health pra confirmar e corrija na Vercel.";
  }
  if (message.includes("column") && message.includes("does not exist")) {
    return "O banco publicado está sem uma coluna esperada. Rode/republique as migrações antes de testar o bot.";
  }
  if (message.includes("invalid input value for enum")) {
    return "O valor enviado não é aceito por uma coluna de status/classificação do banco.";
  }
  if (message.includes("relation") && message.includes("does not exist")) {
    return "A tabela de relatórios não existe no banco conectado ao deploy. Provavelmente SUPABASE_URL está apontando pro projeto errado.";
  }
  return "O banco recusou o relatório. Abra /api/public/discord-report/health pra diagnosticar.";
}

export async function handleDiscordReportWebhook(request: Request): Promise<Response> {
  const missingEnv = getMissingEnv();
  if (missingEnv.length > 0) {
    console.error("discord-report missing env:", missingEnv.join(", "));
    return jsonResponse(
      {
        error: "Server misconfigured",
        detail: `Faltam variáveis no deploy do PDA: ${missingEnv.join(", ")}`,
      },
      500,
    );
  }

  const provided = request.headers.get("x-webhook-secret");
  if (provided !== process.env.DISCORD_WEBHOOK_SECRET) {
    return jsonResponse(
      {
        error: "Unauthorized",
        detail:
          "PDA_WEBHOOK_SECRET no bot/Railway não bate com DISCORD_WEBHOOK_SECRET no deploy do PDA.",
      },
      401,
    );
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    const json = await request.json();
    parsed = bodySchema.parse(json);
  } catch (e) {
    return jsonResponse(
      {
        error: "Invalid body",
        detail: e instanceof Error ? e.message : "parse error",
      },
      400,
    );
  }

  let stalkerId: string | null = null;
  if (parsed.stalker_steam_id) {
    const { data: stalker, error } = await supabaseAdmin
      .from("stalkers")
      .select("id")
      .eq("steam_id", parsed.stalker_steam_id)
      .maybeSingle();

    if (error) {
      console.error("discord-report stalker lookup error:", error.message);
      return jsonResponse(
        { error: "Stalker lookup failed", detail: publicInsertError(error.message) },
        500,
      );
    }
    stalkerId = stalker?.id ?? null;
  }

  // Se for registro, vamos criar o stalker se ele não existir
  if (parsed.type === "register" && !stalkerId && parsed.stalker_steam_id && parsed.character_name) {
    const { data: newStalker, error: createError } = await supabaseAdmin
      .from("stalkers")
      .insert({
        name: parsed.character_name,
        steam_id: parsed.stalker_steam_id,
        photo_url: parsed.attachments && parsed.attachments.length > 0 ? parsed.attachments[0] : null,
        reputation: 0,
        badge_tier: 1,
        discord_user_id: parsed.discord_user_id,
      } as any)
      .select("id")
      .single();
    
    if (!createError) {
      stalkerId = newStalker.id;
    }
  }

  // Se for notificação de aprovação, o site vai enviar um sinal para o bot
  if (parsed.type === "approval_notification" && parsed.discord_user_id) {
    const botUrl = process.env.BOT_API_URL;
    if (!botUrl) {
      console.error("BOT_API_URL não configurada — aprovação não foi notificada ao bot.");
      return jsonResponse(
        { error: "BOT_API_URL missing", detail: "Configure BOT_API_URL no deploy do PDA." },
        500,
      );
    }

    fetch(botUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": process.env.DISCORD_WEBHOOK_SECRET || "",
      },
      body: JSON.stringify(parsed),
    }).catch(err => console.error("Falha ao repassar sinal para o bot:", err));

    return jsonResponse({ ok: true, message: "Notification signal received" }, 200);
  }

  const { data: inserted, error } = await supabaseAdmin
    .from("pending_reports")
    .insert({
      source: (parsed.type === "register" ? "discord_register" : "discord") as any,
      raw_text: parsed.raw_text,
      stalker_steam_id: parsed.stalker_steam_id ?? null,
      stalker_id: stalkerId,
      mission_id: parsed.mission_id ?? null,
      attachments: parsed.attachments ?? [],
      discord_user_id: parsed.discord_user_id ?? null,
      discord_username: parsed.discord_username ?? null,
      discord_channel_id: parsed.discord_channel_id ?? null,
      status: "pending",
    } as any)
    .select("id")
    .single();

  if (error) {
    console.error("discord-report insert error:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return jsonResponse(
      {
        error: "Insert failed",
        code: error.code,
        detail: publicInsertError(error.message),
      },
      500,
    );
  }

  return jsonResponse({ ok: true, id: inserted.id }, 201);
}
