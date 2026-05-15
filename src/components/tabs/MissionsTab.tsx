import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X, Loader2, Trash2, CheckCircle2, Archive } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { missionSchema, type MissionInput } from "@/lib/schemas";
import { PdaHeader, PdaPanel } from "@/components/pda/PdaShell";
import { DIFFICULTY_LABEL, DIFFICULTY_COLOR } from "@/lib/badges";

interface Mission {
  id: string;
  name: string;
  description: string | null;
  reward_money: number;
  reward_reputation: number;
  difficulty: "low" | "medium" | "high" | "extreme";
  status: "active" | "completed" | "archived";
  assigned_stalker_id: string | null;
  created_at: string;
}

interface StalkerLite {
  id: string;
  name: string;
}

export function MissionsTab() {
  const { hasMinRole } = useAuth();
  const canEdit = hasMinRole("medio");
  const canDelete = hasMinRole("high");

  const [missions, setMissions] = useState<Mission[]>([]);
  const [stalkers, setStalkers] = useState<StalkerLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | Mission["status"]>("active");

  const load = async () => {
    setLoading(true);
    const [{ data: m }, { data: s }] = await Promise.all([
      supabase.from("missions").select("*").order("created_at", { ascending: false }),
      supabase.from("stalkers").select("id, name").order("name"),
    ]);
    setMissions((m as Mission[]) ?? []);
    setStalkers((s as StalkerLite[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = missions.filter((m) => statusFilter === "all" || m.status === statusFilter);

  const setStatus = async (id: string, status: Mission["status"]) => {
    const { error } = await supabase.from("missions").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover missão?")) return;
    const { error } = await supabase.from("missions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Missão removida");
    load();
  };

  const stalkerName = (id: string | null) =>
    id ? (stalkers.find((s) => s.id === id)?.name ?? "—") : "—";

  return (
    <div>
      <PdaHeader
        title="Missões"
        right={
          canEdit && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 border border-primary text-primary px-3 py-1.5 text-xs uppercase hover:bg-primary hover:text-primary-foreground"
            >
              {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              {showForm ? "Cancelar" : "Criar Missão"}
            </button>
          )
        }
      />

      {showForm && canEdit && (
        <div className="mb-4">
          <MissionForm
            stalkers={stalkers}
            onSaved={() => {
              setShowForm(false);
              load();
            }}
          />
        </div>
      )}

      <div className="flex gap-1 mb-4">
        {(["all", "active", "completed", "archived"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-2.5 py-1.5 text-[11px] uppercase border ${
              statusFilter === s
                ? "border-primary text-primary bg-accent"
                : "border-border text-muted-foreground hover:border-primary"
            }`}
          >
            {s === "all"
              ? "Todas"
              : s === "active"
                ? "Ativas"
                : s === "completed"
                  ? "Concluídas"
                  : "Arquivadas"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground text-sm py-12 border border-dashed border-border">
          Nenhuma missão
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => (
            <PdaPanel key={m.id}>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display pda-glow text-sm uppercase">▌ {m.name}</span>
                    <span className={`text-[10px] uppercase ${DIFFICULTY_COLOR[m.difficulty]}`}>
                      [{DIFFICULTY_LABEL[m.difficulty]}]
                    </span>
                    <span
                      className={`text-[10px] uppercase border px-1.5 ${
                        m.status === "active"
                          ? "border-primary text-primary"
                          : m.status === "completed"
                            ? "border-pda-warn text-pda-warn"
                            : "border-muted-foreground text-muted-foreground"
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                  {m.description && (
                    <p className="text-xs text-muted-foreground mt-1.5 whitespace-pre-wrap">
                      {m.description}
                    </p>
                  )}
                  <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
                    <div>
                      <span className="text-muted-foreground">RECOMP: </span>
                      <span className="text-primary">${m.reward_money}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">REP: </span>
                      <span className="text-primary">+{m.reward_reputation}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">ATRIB: </span>
                      <span className="text-foreground">{stalkerName(m.assigned_stalker_id)}</span>
                    </div>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex flex-col gap-1">
                    {m.status !== "completed" && (
                      <button
                        onClick={() => setStatus(m.id, "completed")}
                        title="Concluir"
                        className="border border-border p-1.5 text-pda-warn hover:border-pda-warn"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                      </button>
                    )}
                    {m.status !== "archived" && (
                      <button
                        onClick={() => setStatus(m.id, "archived")}
                        title="Arquivar"
                        className="border border-border p-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Archive className="h-3 w-3" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => remove(m.id)}
                        className="border border-destructive/50 p-1.5 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </PdaPanel>
          ))}
        </div>
      )}
    </div>
  );
}

function MissionForm({ stalkers, onSaved }: { stalkers: StalkerLite[]; onSaved: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MissionInput>({
    resolver: zodResolver(missionSchema),
    defaultValues: {
      name: "",
      description: "",
      reward_money: 1000,
      reward_reputation: 100,
      difficulty: "medium",
      assigned_stalker_id: null,
    },
  });

  const onSubmit = async (d: MissionInput) => {
    setSubmitting(true);
    const { error } = await supabase.from("missions").insert({
      name: d.name,
      description: d.description || null,
      reward_money: d.reward_money,
      reward_reputation: d.reward_reputation,
      difficulty: d.difficulty,
      assigned_stalker_id: d.assigned_stalker_id || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Missão criada");
    reset();
    onSaved();
  };

  return (
    <PdaPanel>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
        ▌ Nova missão
      </div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs"
      >
        <div className="md:col-span-2">
          <label className="block text-[10px] uppercase text-muted-foreground mb-1">Nome</label>
          <input
            {...register("name")}
            className="pda-input"
            placeholder="Limpar campo de bandidos no Cordão"
          />
          {errors.name && (
            <p className="text-destructive text-[10px] mt-1">{errors.name.message}</p>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="block text-[10px] uppercase text-muted-foreground mb-1">
            Descrição
          </label>
          <textarea {...register("description")} className="pda-input min-h-[60px]" />
        </div>
        <div>
          <label className="block text-[10px] uppercase text-muted-foreground mb-1">
            Recompensa $
          </label>
          <input
            type="number"
            {...register("reward_money", { valueAsNumber: true })}
            className="pda-input"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase text-muted-foreground mb-1">
            Recompensa REP
          </label>
          <input
            type="number"
            {...register("reward_reputation", { valueAsNumber: true })}
            className="pda-input"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase text-muted-foreground mb-1">
            Dificuldade
          </label>
          <select {...register("difficulty")} className="pda-input">
            <option value="low">Baixa</option>
            <option value="medium">Média</option>
            <option value="high">Alta</option>
            <option value="extreme">Extrema</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase text-muted-foreground mb-1">
            Atribuir a
          </label>
          <select {...register("assigned_stalker_id")} className="pda-input">
            <option value="">— Nenhum —</option>
            {stalkers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="border border-primary text-primary px-4 py-2 text-xs uppercase hover:bg-primary hover:text-primary-foreground disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Loader2 className="h-3 w-3 animate-spin" />} ▶ Criar
          </button>
        </div>
      </form>
    </PdaPanel>
  );
}
