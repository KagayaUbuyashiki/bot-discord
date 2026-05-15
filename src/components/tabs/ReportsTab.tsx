import { useEffect, useState } from "react";
import {
  Loader2,
  Brain,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  ImageIcon,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PdaHeader, PdaPanel } from "@/components/pda/PdaShell";
import { analyzePendingReport } from "@/lib/ai-reports.functions";

interface Analysis {
  summary: string;
  classification: "success" | "partial" | "failure";
  reputation_awarded: number;
  money_awarded: number;
  tags: string[];
  alerts: string[];
  matched_stalker_hint?: string | null;
}

interface Pending {
  id: string;
  raw_text: string;
  stalker_steam_id: string | null;
  stalker_id: string | null;
  mission_id: string | null;
  ai_analysis: Analysis | null;
  status: "pending" | "approved" | "rejected";
  source: string;
  created_at: string;
  attachments: string[] | null;
  discord_user_id: string | null;
  discord_username: string | null;
  discord_channel_id: string | null;
}

interface StalkerLite {
  id: string;
  name: string;
  steam_id: string;
}

export function ReportsTab() {
  const { user, hasMinRole } = useAuth();
  const canModerate = hasMinRole("medio");
  const analyze = useServerFn(analyzePendingReport);

  const [list, setList] = useState<Pending[]>([]);
  const [stalkers, setStalkers] = useState<StalkerLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    const [repRes, stRes] = await Promise.all([
      supabase
        .from("pending_reports")
        .select("*")
        .eq("status", "pending")
        .neq("source", "discord_register")
        .order("created_at", { ascending: false }),
      supabase.from("stalkers").select("id, name, steam_id").order("name"),
    ]);
    if (repRes.error) {
      setLoadError(`Falha ao carregar relatórios: ${repRes.error.message}`);
    }
    setList((repRes.data as Pending[]) ?? []);
    setStalkers((stRes.data as StalkerLite[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const runAnalysis = async (id: string) => {
    setBusy(id);
    try {
      await analyze({ data: { id } });
      toast.success("Análise concluída");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na análise");
    } finally {
      setBusy(null);
    }
  };

  const approve = async (p: Pending, stalkerOverrideId?: string) => {
    if (!p.ai_analysis) return toast.error("Rode a análise IA primeiro");
    const stalkerId = stalkerOverrideId || p.stalker_id;
    if (!stalkerId) return toast.error("Vincule um stalker antes de aprovar");

    setBusy(p.id);
    const { error: insErr } = await supabase.from("mission_reports").insert({
      stalker_id: stalkerId,
      mission_id: p.mission_id,
      summary: p.ai_analysis.summary,
      classification: p.ai_analysis.classification,
      reputation_awarded: p.ai_analysis.reputation_awarded,
      money_awarded: p.ai_analysis.money_awarded,
      tags: p.ai_analysis.tags,
      raw_text: p.raw_text,
      approved_by: user?.id ?? null,
    });
    if (insErr) {
      setBusy(null);
      return toast.error(insErr.message);
    }

    // Bump stalker reputation + missions count
    const { data: cur } = await supabase
      .from("stalkers")
      .select("reputation, missions_completed")
      .eq("id", stalkerId)
      .maybeSingle();
    if (cur) {
      await supabase
        .from("stalkers")
        .update({
          reputation: Math.min(4000, cur.reputation + p.ai_analysis.reputation_awarded),
          missions_completed:
            cur.missions_completed + (p.ai_analysis.classification === "success" ? 1 : 0),
        })
        .eq("id", stalkerId);
    }

    // Mark mission completed if linked + success
    if (p.mission_id && p.ai_analysis.classification === "success") {
      await supabase.from("missions").update({ status: "completed" }).eq("id", p.mission_id);
    }

    await supabase.from("pending_reports").update({ status: "approved" }).eq("id", p.id);
    toast.success("Relatório aprovado");
    setBusy(null);
    load();
  };

  const reject = async (id: string) => {
    if (!confirm("Rejeitar este relatório?")) return;
    setBusy(id);
    const { error } = await supabase
      .from("pending_reports")
      .update({ status: "rejected" })
      .eq("id", id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Rejeitado");
    load();
  };

  return (
    <div>
      <PdaHeader
        title={`Relatórios Pendentes — ${list.length}`}
        right={
          <button
            onClick={load}
            className="flex items-center gap-1.5 border border-border text-muted-foreground px-3 py-1.5 text-xs uppercase hover:border-primary hover:text-primary"
          >
            <RefreshCw className="h-3 w-3" /> Atualizar
          </button>
        }
      />

      {!canModerate && (
        <div className="text-xs text-pda-warn mb-3">⚠ Apenas Médio+ pode aprovar relatórios.</div>
      )}

      {loadError && (
        <div className="border border-destructive/50 bg-destructive/10 text-destructive text-xs p-3 mb-3">
          {loadError}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : list.length === 0 ? (
        <div className="text-center text-muted-foreground text-sm py-12 border border-dashed border-border">
          Nenhum relatório pendente. Aguardando webhook do Discord.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((p) => (
            <PendingCard
              key={p.id}
              p={p}
              stalkers={stalkers}
              busy={busy === p.id}
              canModerate={canModerate}
              onAnalyze={() => runAnalysis(p.id)}
              onApprove={(stalkerOverrideId) => approve(p, stalkerOverrideId)}
              onReject={() => reject(p.id)}
              onReload={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PendingCard({
  p,
  stalkers,
  busy,
  canModerate,
  onAnalyze,
  onApprove,
  onReject,
  onReload,
}: {
  p: Pending;
  stalkers: StalkerLite[];
  busy: boolean;
  canModerate: boolean;
  onAnalyze: () => void;
  onApprove: (stalkerOverrideId?: string) => void;
  onReject: () => void;
  onReload: () => Promise<void>;
}) {
  const [chosenStalker, setChosenStalker] = useState<string>(p.stalker_id ?? "");
  const [showStalkerForm, setShowStalkerForm] = useState(false);
  const [showMissionForm, setShowMissionForm] = useState(false);

  const matched = stalkers.find((s) => s.id === p.stalker_id);
  const a = p.ai_analysis;

  return (
    <PdaPanel>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase text-muted-foreground">
            {p.source} · {new Date(p.created_at).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Steam ID: <span className="text-primary">{p.stalker_steam_id ?? "—"}</span>
            {matched && (
              <>
                {" "}
                · Vinculado a <span className="text-primary">{matched.name}</span>
              </>
            )}
          </div>
          {p.discord_username && (
            <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Discord: <span className="text-primary">{p.discord_username}</span>
              {p.discord_user_id && <span className="opacity-60">({p.discord_user_id})</span>}
            </div>
          )}
        </div>
        <div
          className={`text-[10px] px-2 py-0.5 border ${
            a ? "border-primary text-primary" : "border-pda-warn text-pda-warn"
          }`}
        >
          {a ? "ANALISADO" : "BRUTO"}
        </div>
      </div>

      <div className="border border-border bg-input/30 p-3 text-xs whitespace-pre-wrap mb-3 max-h-40 overflow-y-auto">
        {p.raw_text}
      </div>

      {p.attachments && p.attachments.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] uppercase text-muted-foreground mb-1.5 flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            Anexos do PDA ({p.attachments.length})
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {p.attachments.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block border border-border hover:border-primary transition-colors aspect-video bg-input/30 overflow-hidden"
              >
                <img
                  src={url}
                  alt={`Anexo ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {a && (
        <div className="border border-primary/40 bg-primary/5 p-3 mb-3 space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <Brain className="h-3 w-3 text-primary" />
            <span className="text-[10px] uppercase text-primary">Análise IA</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 border ${
                a.classification === "success"
                  ? "border-primary text-primary"
                  : a.classification === "partial"
                    ? "border-pda-warn text-pda-warn"
                    : "border-destructive text-destructive"
              }`}
            >
              {a.classification.toUpperCase()}
            </span>
          </div>
          <div>{a.summary}</div>
          <div className="flex flex-wrap gap-3 text-[11px]">
            <span className="text-pda-warn">+{a.reputation_awarded} REP</span>
            <span className="text-pda-warn">+₽{a.money_awarded.toLocaleString()}</span>
            {a.tags.length > 0 && (
              <span className="text-muted-foreground">#{a.tags.join(" #")}</span>
            )}
          </div>
          {a.alerts.length > 0 && (
            <div className="border-t border-border pt-2 mt-2 space-y-1">
              {a.alerts.map((al, i) => (
                <div key={i} className="flex items-start gap-1.5 text-destructive text-[11px]">
                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>{al}</span>
                </div>
              ))}
            </div>
          )}
          {a.matched_stalker_hint && !matched && (
            <div className="text-[10px] text-muted-foreground italic">
              IA sugere stalker: "{a.matched_stalker_hint}"
            </div>
          )}
        </div>
      )}

      {canModerate && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            {!a && (
              <button
                onClick={onAnalyze}
                disabled={busy}
                className="flex items-center gap-1.5 border border-primary text-primary px-3 py-1.5 text-xs uppercase hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Brain className="h-3 w-3" />}
                Analisar com IA
              </button>
            )}
            {a && (
              <>
                {!matched && (
                  <select
                    value={chosenStalker}
                    onChange={(e) => setChosenStalker(e.target.value)}
                    className="pda-input text-xs py-1.5"
                  >
                    <option value="">— Vincular stalker —</option>
                    {stalkers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.steam_id})
                      </option>
                    ))}
                  </select>
                )}
                {!matched && p.stalker_steam_id && (
                  <button
                    onClick={() => setShowStalkerForm((v) => !v)}
                    disabled={busy}
                    className="flex items-center gap-1.5 border border-pda-warn text-pda-warn px-3 py-1.5 text-xs uppercase hover:bg-pda-warn/10"
                  >
                    + Criar stalker
                  </button>
                )}
                {!p.mission_id && (
                  <button
                    onClick={() => setShowMissionForm((v) => !v)}
                    disabled={busy}
                    className="flex items-center gap-1.5 border border-pda-warn text-pda-warn px-3 py-1.5 text-xs uppercase hover:bg-pda-warn/10"
                  >
                    + Criar missão
                  </button>
                )}
                <button
                  onClick={() => onApprove(chosenStalker || undefined)}
                  disabled={busy}
                  className="flex items-center gap-1.5 border border-primary text-primary px-3 py-1.5 text-xs uppercase hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Aprovar
                </button>
                <button
                  onClick={onAnalyze}
                  disabled={busy}
                  className="flex items-center gap-1.5 border border-border text-muted-foreground px-3 py-1.5 text-xs uppercase hover:border-primary hover:text-primary"
                >
                  <RefreshCw className="h-3 w-3" /> Re-analisar
                </button>
              </>
            )}
            <button
              onClick={onReject}
              disabled={busy}
              className="flex items-center gap-1.5 border border-destructive/50 text-destructive px-3 py-1.5 text-xs uppercase hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50 ml-auto"
            >
              <X className="h-3 w-3" /> Rejeitar
            </button>
          </div>

          {showStalkerForm && (
            <CreateStalkerInline
              pendingId={p.id}
              steamId={p.stalker_steam_id ?? ""}
              suggestedName={a?.matched_stalker_hint ?? p.discord_username ?? ""}
              discordUserId={p.discord_user_id}
              onDone={async () => {
                setShowStalkerForm(false);
                await onReload();
              }}
            />
          )}

          {showMissionForm && (
            <CreateMissionInline
              pendingId={p.id}
              suggestedName={a?.tags?.[0] ?? ""}
              suggestedReputation={a?.reputation_awarded ?? 0}
              suggestedMoney={a?.money_awarded ?? 0}
              onDone={async () => {
                setShowMissionForm(false);
                await onReload();
              }}
            />
          )}
        </div>
      )}
    </PdaPanel>
  );
}

function CreateStalkerInline({
  pendingId,
  steamId,
  suggestedName,
  discordUserId,
  onDone,
}: {
  pendingId: string;
  steamId: string;
  suggestedName: string;
  discordUserId: string | null;
  onDone: () => Promise<void>;
}) {
  const [name, setName] = useState(suggestedName);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim() || !steamId) return toast.error("Nome e Steam ID são obrigatórios");
    setSaving(true);
    const { data: stalker, error } = await supabase
      .from("stalkers")
      .insert({
        name: name.trim(),
        steam_id: steamId,
        reputation: 0,
        badge_tier: 1,
        ...(discordUserId ? ({ discord_user_id: discordUserId } as any) : {}),
      } as any)
      .select("id")
      .single();
    if (error || !stalker) {
      setSaving(false);
      return toast.error(error?.message ?? "Falha ao criar stalker");
    }
    await supabase.from("pending_reports").update({ stalker_id: stalker.id }).eq("id", pendingId);
    toast.success("Stalker criado e vinculado");
    setSaving(false);
    await onDone();
  };

  return (
    <div className="border border-pda-warn/40 bg-pda-warn/5 p-3 text-xs space-y-2">
      <div className="text-[10px] uppercase text-pda-warn">Criar stalker novo</div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome do personagem"
        className="pda-input w-full"
      />
      <div className="text-[10px] text-muted-foreground">Steam ID: {steamId || "—"}</div>
      <button
        onClick={submit}
        disabled={saving}
        className="flex items-center gap-1.5 border border-primary text-primary px-3 py-1.5 text-xs uppercase hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        Criar e vincular
      </button>
    </div>
  );
}

function CreateMissionInline({
  pendingId,
  suggestedName,
  suggestedReputation,
  suggestedMoney,
  onDone,
}: {
  pendingId: string;
  suggestedName: string;
  suggestedReputation: number;
  suggestedMoney: number;
  onDone: () => Promise<void>;
}) {
  const [name, setName] = useState(suggestedName);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "extreme">("medium");
  const [reputation, setReputation] = useState(suggestedReputation);
  const [money, setMoney] = useState(suggestedMoney);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return toast.error("Nome da missão é obrigatório");
    setSaving(true);
    const { data: mission, error } = await supabase
      .from("missions")
      .insert({
        name: name.trim(),
        difficulty: difficulty as any,
        status: "active" as any,
        reward_reputation: reputation,
        reward_money: money,
      })
      .select("id")
      .single();
    if (error || !mission) {
      setSaving(false);
      return toast.error(error?.message ?? "Falha ao criar missão");
    }
    await supabase.from("pending_reports").update({ mission_id: mission.id }).eq("id", pendingId);
    toast.success("Missão criada e vinculada");
    setSaving(false);
    await onDone();
  };

  return (
    <div className="border border-pda-warn/40 bg-pda-warn/5 p-3 text-xs space-y-2">
      <div className="text-[10px] uppercase text-pda-warn">Criar missão nova</div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome da missão"
        className="pda-input w-full"
      />
      <div className="grid grid-cols-3 gap-2">
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as any)}
          className="pda-input"
        >
          <option value="easy">Fácil</option>
          <option value="medium">Média</option>
          <option value="hard">Difícil</option>
          <option value="extreme">Extrema</option>
        </select>
        <input
          type="number"
          value={reputation}
          onChange={(e) => setReputation(Number(e.target.value))}
          placeholder="REP"
          className="pda-input"
        />
        <input
          type="number"
          value={money}
          onChange={(e) => setMoney(Number(e.target.value))}
          placeholder="₽"
          className="pda-input"
        />
      </div>
      <button
        onClick={submit}
        disabled={saving}
        className="flex items-center gap-1.5 border border-primary text-primary px-3 py-1.5 text-xs uppercase hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        Criar e vincular
      </button>
    </div>
  );
}
