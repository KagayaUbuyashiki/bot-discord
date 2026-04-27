import { config } from "../config.js";
import { TicketState } from "./state.js";

export interface SubmitResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export async function submitReport(state: TicketState): Promise<SubmitResult> {
  const a = state.answers;
  const rawText = [
    `Stalker (Discord): ${state.username}`,
    `Steam ID: ${a.steam_id ?? "não informado"}`,
    "",
    `Status da missão: ${a.completed ?? "—"}`,
    `Missão: ${a.mission_name ?? "—"}`,
    "",
    `Relato:`,
    a.how_was_it ?? "—",
    "",
    `Dificuldade percebida: ${a.difficulty ?? "—"}`,
    `Mutantes abatidos: ${a.mutants_killed ?? "—"}`,
    `Observações: ${a.observations ?? "nenhuma"}`,
  ].join("\n");

  try {
    const res = await fetch(config.pdaApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": config.pdaSecret,
      },
      body: JSON.stringify({
        raw_text: rawText,
        stalker_steam_id: a.steam_id || undefined,
        attachments: state.attachments,
        discord_user_id: state.userId,
        discord_username: state.username,
        discord_channel_id: state.channelId,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; id?: string; error?: string };

    if (!res.ok) {
      return { ok: false, error: data.error || `HTTP ${res.status}` };
    }
    return { ok: true, id: data.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Erro de rede",
    };
  }
}
