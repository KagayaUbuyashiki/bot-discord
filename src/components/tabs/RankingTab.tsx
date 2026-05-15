import { useEffect, useState } from "react";
import { Trophy, Award, Loader2, Target, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PdaHeader, PdaPanel } from "@/components/pda/PdaShell";
import { TIER_NAMES, tierFromReputation } from "@/lib/badges";
import { useAuth } from "@/lib/auth-context";

interface Row {
  id: string;
  name: string;
  reputation: number;
  missions_completed: number;
  badge_tier: number;
  photo_url: string | null;
}

export function RankingTab() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"reputation" | "missions">("reputation");

  const isApproved = profile?.status === "approved";
  const userReputation = profile?.reputation ?? 0;
  const userTier = tierFromReputation(userReputation);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("stalkers")
        .select("id, name, reputation, missions_completed, badge_tier, photo_url");
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, []);

  // Filtragem hierárquica: 
  // Usuários não aprovados ou de tier baixo só veem membros do seu tier ou inferior.
  const filteredRows = rows.filter(r => {
    if (isApproved) return true; // Admins/Aprovados veem tudo
    const stalkerTier = tierFromReputation(r.reputation);
    return stalkerTier <= userTier;
  });

  const sorted = [...filteredRows].sort((a, b) =>
    view === "reputation"
      ? b.reputation - a.reputation
      : b.missions_completed - a.missions_completed,
  );

  const medal = (i: number) => {
    if (i === 0) return "text-pda-warn pda-glow";
    if (i === 1) return "text-pda-dim";
    if (i === 2) return "text-destructive/70";
    return "text-muted-foreground";
  };

  return (
    <div>
      <PdaHeader title="Leaderboard" />

      {!isApproved && (
        <div className="mb-4 bg-pda-warn/10 border border-pda-warn/30 p-3 flex items-center gap-3 animate-pulse">
          <ShieldAlert className="h-5 w-5 text-pda-warn shrink-0" />
          <p className="text-[11px] uppercase font-bold text-pda-warn tracking-tighter">
            Para ter acesso aos membros da outra tier suba de ranking
          </p>
        </div>
      )}

      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setView("reputation")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase border ${
            view === "reputation"
              ? "border-primary text-primary bg-accent"
              : "border-border text-muted-foreground hover:border-primary"
          }`}
        >
          <Trophy className="h-3 w-3" /> Reputação
        </button>
        <button
          onClick={() => setView("missions")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase border ${
            view === "missions"
              ? "border-primary text-primary bg-accent"
              : "border-border text-muted-foreground hover:border-primary"
          }`}
        >
          <Target className="h-3 w-3" /> Missões
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center text-muted-foreground text-sm py-12 border border-dashed border-border">
          Sem stalkers cadastrados
        </div>
      ) : (
        <PdaPanel>
          <ul className="space-y-1">
            {sorted.map((r, i) => {
              const tier = tierFromReputation(r.reputation);
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-3 py-2 px-2 border-b border-border/50 last:border-b-0"
                >
                  <span className={`font-display text-2xl w-10 text-center ${medal(i)}`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="w-10 h-10 border border-border bg-input/40 shrink-0 overflow-hidden">
                    {r.photo_url ? (
                      <img src={r.photo_url} alt={r.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[8px]">
                        —
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display uppercase text-sm pda-glow truncate">{r.name}</div>
                    <div className="text-[10px] text-pda-warn flex items-center gap-1">
                      <Award className="h-3 w-3" /> {TIER_NAMES[tier]}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg pda-glow">
                      {view === "reputation" ? r.reputation : r.missions_completed}
                    </div>
                    <div className="text-[10px] uppercase text-muted-foreground">
                      {view === "reputation" ? "REP" : "MISSÕES"}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </PdaPanel>
      )}
    </div>
  );
}
