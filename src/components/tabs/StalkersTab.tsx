import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search, X, ChevronDown, Loader2, Trash2, Award } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { stalkerSchema, type StalkerInput } from "@/lib/schemas";
import { PdaHeader, PdaPanel } from "@/components/pda/PdaShell";
import {
  TIER_NAMES,
  tierFromReputation,
  nextTierThreshold,
  progressToNextTier,
} from "@/lib/badges";

interface Stalker {
  id: string;
  name: string;
  steam_id: string;
  photo_url: string | null;
  reputation: number;
  badge_tier: number;
  missions_completed: number;
  notes: string | null;
  created_at: string;
}

interface ReportRow {
  id: string;
  summary: string;
  classification: string;
  money_awarded: number;
  reputation_awarded: number;
  created_at: string;
  mission_id: string | null;
}

export function StalkersTab() {
  const { hasMinRole } = useAuth();
  const canEdit = hasMinRole("medio");
  const canDelete = hasMinRole("high");

  const [list, setList] = useState<Stalker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<number | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reports, setReports] = useState<Record<string, ReportRow[]>>({});
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("stalkers")
      .select("*")
      .order("reputation", { ascending: false });
    if (error) toast.error(error.message);
    setList((data as Stalker[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const loadReports = async (stalkerId: string) => {
    if (reports[stalkerId]) return;
    const { data } = await supabase
      .from("mission_reports")
      .select(
        "id, summary, classification, money_awarded, reputation_awarded, created_at, mission_id",
      )
      .eq("stalker_id", stalkerId)
      .order("created_at", { ascending: false });
    setReports((r) => ({ ...r, [stalkerId]: (data as ReportRow[]) ?? [] }));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((s) => {
      if (tierFilter !== "all" && s.badge_tier !== tierFilter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.steam_id.toLowerCase().includes(q) ||
        String(s.badge_tier).includes(q)
      );
    });
  }, [list, search, tierFilter]);

  const onDelete = async (id: string) => {
    if (!confirm("Remover ficha permanentemente?")) return;
    const { error } = await supabase.from("stalkers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Ficha removida");
    load();
  };

  return (
    <div>
      <PdaHeader
        title={`Stalkers — ${filtered.length}/${list.length}`}
        right={
          canEdit && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 border border-primary text-primary px-3 py-1.5 text-xs uppercase hover:bg-primary hover:text-primary-foreground"
            >
              {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              {showForm ? "Cancelar" : "Cadastrar"}
            </button>
          )
        }
      />

      {showForm && canEdit && (
        <div className="mb-4">
          <StalkerForm
            onSaved={() => {
              setShowForm(false);
              load();
            }}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-2 border border-border bg-input/40 px-3 py-1.5 flex-1 min-w-[200px]">
          <Search className="h-3 w-3 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, Steam ID ou tier..."
            className="bg-transparent outline-none text-xs flex-1"
          />
        </div>
        <div className="flex gap-1">
          {(["all", 1, 2, 3, 4] as const).map((t) => (
            <button
              key={String(t)}
              onClick={() => setTierFilter(t)}
              className={`px-2.5 py-1.5 text-[11px] uppercase border ${
                tierFilter === t
                  ? "border-primary text-primary bg-accent"
                  : "border-border text-muted-foreground hover:border-primary"
              }`}
            >
              {t === "all" ? "Todos" : `T${t}`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground text-sm py-12 border border-dashed border-border">
          Nenhum stalker encontrado
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((s) => {
            const isOpen = expanded === s.id;
            const tier = tierFromReputation(s.reputation);
            const progress = progressToNextTier(s.reputation);
            return (
              <div key={s.id} className={isOpen ? "md:col-span-2 lg:col-span-3" : ""}>
                <PdaPanel className="cursor-pointer hover:border-primary transition-colors">
                  <div
                    onClick={() => {
                      setExpanded(isOpen ? null : s.id);
                      if (!isOpen) loadReports(s.id);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 border border-border bg-input/40 shrink-0 overflow-hidden">
                        {s.photo_url ? (
                          <img
                            src={s.photo_url}
                            alt={s.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">
                            NO IMG
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-display pda-glow text-sm uppercase truncate">
                            {s.name}
                          </div>
                          <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {s.steam_id}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Award className="h-3 w-3 text-pda-warn" />
                          <span className="text-[10px] uppercase text-pda-warn">
                            {TIER_NAMES[tier]}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>REP: {s.reputation}</span>
                        <span>{tier >= 4 ? "MAX" : `→ ${nextTierThreshold(s.reputation)}`}</span>
                      </div>
                      <div className="h-1.5 bg-input border border-border overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${progress}%`, boxShadow: "0 0 6px var(--pda-glow)" }}
                        />
                      </div>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <Stat label="Missões" value={String(s.missions_completed)} />
                        <Stat
                          label="Cadastrado em"
                          value={new Date(s.created_at).toLocaleDateString()}
                        />
                      </div>
                      {s.notes && (
                        <div>
                          <div className="text-[10px] uppercase text-muted-foreground mb-1">
                            Observações
                          </div>
                          <div className="border border-border bg-input/30 p-2 whitespace-pre-wrap">
                            {s.notes}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground mb-1">
                          Histórico de relatórios
                        </div>
                        {reports[s.id]?.length ? (
                          <ul className="space-y-1.5 max-h-60 overflow-y-auto">
                            {reports[s.id].map((r) => (
                              <li key={r.id} className="border border-border bg-input/30 p-2">
                                <div className="flex justify-between gap-2">
                                  <span
                                    className={
                                      r.classification === "success"
                                        ? "text-primary"
                                        : r.classification === "partial"
                                          ? "text-pda-warn"
                                          : "text-destructive"
                                    }
                                  >
                                    [{r.classification.toUpperCase()}]
                                  </span>
                                  <span className="text-muted-foreground text-[10px]">
                                    {new Date(r.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="mt-1 text-[11px]">{r.summary}</div>
                                <div className="mt-1 text-[10px] text-muted-foreground">
                                  +{r.reputation_awarded} REP · +${r.money_awarded}
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-muted-foreground text-[11px]">
                            Nenhum relatório registrado
                          </div>
                        )}
                      </div>
                      {canDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(s.id);
                          }}
                          className="flex items-center gap-1.5 border border-destructive/50 text-destructive px-2 py-1 text-[10px] uppercase hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <Trash2 className="h-3 w-3" /> Excluir
                        </button>
                      )}
                    </div>
                  )}
                </PdaPanel>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-input/30 p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-display text-sm pda-glow">{value}</div>
    </div>
  );
}

function StalkerForm({ onSaved }: { onSaved: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<StalkerInput>({
    resolver: zodResolver(stalkerSchema),
    defaultValues: { name: "", steam_id: "", photo_url: "", reputation: 0, notes: "" },
  });

  const photoUrl = watch("photo_url");

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("stalker-photos").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("stalker-photos").getPublicUrl(path);
      setValue("photo_url", data.publicUrl, { shouldValidate: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (d: StalkerInput) => {
    setSubmitting(true);
    const { error } = await supabase.from("stalkers").insert({
      name: d.name,
      steam_id: d.steam_id,
      photo_url: d.photo_url || null,
      reputation: d.reputation,
      notes: d.notes || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Stalker cadastrado");
    reset();
    onSaved();
  };

  return (
    <PdaPanel>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
        ▌ Novo operador
      </div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs"
      >
        <Field label="Nome" error={errors.name?.message}>
          <input {...register("name")} className="pda-input" placeholder="Bituca" />
        </Field>
        <Field label="Steam ID" error={errors.steam_id?.message}>
          <input {...register("steam_id")} className="pda-input" placeholder="76561198..." />
        </Field>
        <Field label="Reputação inicial" error={errors.reputation?.message}>
          <input
            type="number"
            {...register("reputation", { valueAsNumber: true })}
            className="pda-input"
          />
        </Field>
        <Field label="Foto (upload)">
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
              className="text-[10px]"
            />
            {uploading && <Loader2 className="h-3 w-3 animate-spin" />}
            {photoUrl && <span className="text-primary text-[10px]">✓ enviado</span>}
          </div>
        </Field>
        <div className="md:col-span-2">
          <Field label="Observações">
            <textarea {...register("notes")} className="pda-input min-h-[60px]" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="border border-primary text-primary px-4 py-2 text-xs uppercase hover:bg-primary hover:text-primary-foreground disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Loader2 className="h-3 w-3 animate-spin" />} ▶ Cadastrar
          </button>
        </div>
      </form>
    </PdaPanel>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </label>
      {children}
      {error && <p className="text-destructive text-[10px] mt-1">{error}</p>}
    </div>
  );
}
