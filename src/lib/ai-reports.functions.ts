import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const analysisSchema = z.object({
  summary: z.string().min(1).max(800),
  classification: z.enum(["success", "partial", "failure"]),
  reputation_awarded: z.number().int().min(0).max(500),
  money_awarded: z.number().int().min(0).max(1_000_000),
  tags: z.array(z.string().max(40)).max(10),
  alerts: z.array(z.string().max(200)).max(5),
  matched_stalker_hint: z.string().max(120).nullable().optional(),
});

type Analysis = z.infer<typeof analysisSchema>;

/**
 * Calls Lovable AI Gateway to analyze a raw mission report.
 * Returns a structured analysis usable by the moderator.
 */
async function callAi(rawText: string, missionContext: string | null): Promise<Analysis> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const systemPrompt = `Você é o oficial de inteligência da facção Free Stalkers (servidor RP de S.T.A.L.K.E.R.).
Sua função é analisar relatórios brutos enviados por stalkers e classificá-los.

REGRAS:
- classification: "success" se a missão foi cumprida, "partial" se parcialmente, "failure" se falhou.
- reputation_awarded: 0–500. Use 50 (baixa), 100 (média), 200 (alta), 350 (extrema). Reduza pela metade em "partial". Zero em "failure".
- money_awarded: rublos justos pela ação descrita.
- tags: palavras-chave curtas (ex: "anomalia", "mutante", "monolito").
- alerts: alertas IMPORTANTES (ex: "stalker reporta ferimento grave", "menção a traição", "perda de equipamento").
- summary: resumo neutro em 2–3 frases.
- matched_stalker_hint: se o relatório mencionar um nome/Steam ID claro, retorne; senão null.

Responda APENAS o JSON, sem prosa.`;

  const userPrompt = `RELATÓRIO BRUTO:
${rawText}

${missionContext ? `MISSÃO REFERENCIADA:\n${missionContext}` : "Sem missão vinculada."}`;

  const res = await fetch(LOVABLE_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI gateway ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned empty content");

  const parsed = JSON.parse(content);
  return analysisSchema.parse(parsed);
}

/** Analyze a pending_report row and persist analysis. Moderator-only. */
export const analyzePendingReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("pending_reports")
      .select("id, raw_text, mission_id")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Pending report not found");

    let missionCtx: string | null = null;
    if (row.mission_id) {
      const { data: m } = await supabaseAdmin
        .from("missions")
        .select("name, description, difficulty, reward_money, reward_reputation")
        .eq("id", row.mission_id)
        .maybeSingle();
      if (m) {
        missionCtx = `Nome: ${m.name}\nDificuldade: ${m.difficulty}\nRecompensa: ${m.reward_money}₽ / ${m.reward_reputation} REP\n${m.description ?? ""}`;
      }
    }

    const analysis = await callAi(row.raw_text, missionCtx);

    await supabaseAdmin
      .from("pending_reports")
      .update({ ai_analysis: analysis as never })
      .eq("id", row.id);

    return { analysis };
  });
