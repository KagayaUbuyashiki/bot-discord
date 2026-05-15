import { useAuth } from "@/lib/auth-context";
import { PdaHeader, PdaPanel } from "@/components/pda/PdaShell";
import {
  User,
  Target,
  Award,
  Clock,
  ShieldAlert,
  Info,
  ArrowRight,
  Upload,
  Link as LinkIcon,
  X,
  Loader2,
} from "lucide-react";
import { TIER_NAMES, tierFromReputation, nextTierThreshold, progressToNextTier } from "@/lib/badges";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PersonalStats {
  reputation: number;
  missions_completed: number;
  created_at: string;
  photo_url?: string | null;
}

export function MyPdaTab() {
  const { profile, user, refresh } = useAuth();
  const [stats, setStats] = useState<PersonalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [booting, setBooting] = useState(true);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const isApproved = profile?.status === "approved";

  useEffect(() => {
    // Efeito de "Boot" apenas para novatos ou no primeiro carregamento
    const timer = setTimeout(() => setBooting(false), isApproved ? 0 : 1500);
    return () => clearTimeout(timer);
  }, [isApproved]);

  const loadStats = async () => {
    if (!profile?.user_id) return;

    // 1) Tenta achar stalker pelo steam_id do profile (vínculo correto)
    const { data: prof } = await supabase
      .from("profiles")
      .select("steam_id, photo_url")
      .eq("user_id", profile.user_id)
      .maybeSingle();

    const profileSteamId = (prof as any)?.steam_id as string | undefined;
    const profilePhoto = (prof as any)?.photo_url as string | undefined;

    let stalker: any = null;
    if (profileSteamId) {
      const { data } = await supabase
        .from("stalkers")
        .select("reputation, missions_completed, created_at, photo_url")
        .eq("steam_id", profileSteamId)
        .maybeSingle();
      stalker = data;
    }

    if (stalker) {
      setStats({
        reputation: stalker.reputation ?? 0,
        missions_completed: stalker.missions_completed ?? 0,
        created_at: stalker.created_at,
        photo_url: stalker.photo_url ?? profilePhoto ?? null,
      });
    } else {
      setStats({
        reputation: 0,
        missions_completed: 0,
        created_at: profile.created_at || new Date().toISOString(),
        photo_url: profilePhoto ?? null,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.user_id]);

  if (booting && !isApproved) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center font-mono text-primary animate-pulse">
        <div className="text-sm mb-4 tracking-[0.3em]">INICIALIZANDO PDA PESSOAL...</div>
        <div className="w-48 h-1 bg-input border border-primary/30 overflow-hidden">
          <div className="h-full bg-primary animate-[loading_1.5s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
        </div>
        <div className="mt-4 text-[10px] text-muted-foreground uppercase">Criptografia de ponta-a-ponta ativa</div>
      </div>
    );
  }

  const reputation = stats?.reputation ?? 0;
  const tier = tierFromReputation(reputation);
  const progress = progressToNextTier(reputation);

  const persistPhoto = async (newUrl: string) => {
    // Sempre salva no profile (fonte da verdade do operador)
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ photo_url: newUrl } as any)
      .eq("user_id", profile?.user_id as string);

    // Atualiza stalker vinculado pelo steam_id (se existir)
    const { data: prof } = await supabase
      .from("profiles")
      .select("steam_id")
      .eq("user_id", profile?.user_id as string)
      .maybeSingle();
    const steamId = (prof as any)?.steam_id;
    if (steamId) {
      await supabase.from("stalkers").update({ photo_url: newUrl }).eq("steam_id", steamId);
    }

    if (profileError) {
      toast.error("Falha ao salvar foto: " + profileError.message);
      return false;
    }
    toast.success("Foto atualizada!");
    setStats((prev) => (prev ? { ...prev, photo_url: newUrl } : null));
    await refresh();
    setPhotoModalOpen(false);
    return true;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PdaHeader title="SISTEMA PESSOAL" />

      {/* Hero Section - Foco no Operador */}
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-pda-warn/20 rounded-lg blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
        <PdaPanel className="relative overflow-hidden border-primary/30">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            {/* Avatar / Foto */}
            <div 
              className="w-32 h-32 md:w-40 md:h-40 border-2 border-primary/50 bg-input/40 shrink-0 relative cursor-pointer group/photo overflow-hidden"
              onClick={() => setPhotoModalOpen(true)}
            >
              <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none"></div>
              {stats?.photo_url ? (
                <img src={stats.photo_url} className="w-full h-full object-cover transition-transform duration-500 group-hover/photo:scale-110" alt="Avatar" />
              ) : (
                <User className="w-full h-full p-6 text-primary/20" />
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity">
                <span className="text-[10px] text-white font-bold uppercase tracking-tighter">Alterar Foto</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-primary/20 backdrop-blur-sm py-1 text-center text-[10px] uppercase font-bold text-primary border-t border-primary/30">
                Operador {profile?.username}
              </div>
            </div>

            {/* Info Principal */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-3xl pda-glow-strong uppercase tracking-tighter">
                    {profile?.username}
                  </h2>
                  <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                    <Award className="h-4 w-4 text-pda-warn" />
                    <span className="text-xs uppercase text-pda-warn font-bold">
                      {isApproved ? TIER_NAMES[tier] : "CADETE — NÃO OFICIAL"}
                    </span>
                  </div>
                </div>
                
                {!isApproved && (
                  <div className="bg-pda-warn/10 border border-pda-warn/30 p-3 rounded-sm flex items-start gap-3 max-w-xs text-left">
                    <ShieldAlert className="h-5 w-5 text-pda-warn shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[10px] font-bold text-pda-warn uppercase">Acesso Restrito</div>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-1">
                        Seu PDA está em modo de segurança. Aguarde aprovação da liderança para sincronização total com a facção.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
                <StatCard 
                  label="Reputação" 
                  value={reputation} 
                  icon={Award}
                  color="text-primary"
                />
                <StatCard 
                  label="Missões" 
                  value={stats?.missions_completed ?? 0} 
                  icon={Target}
                  color="text-pda-warn"
                />
                <StatCard 
                  label="Tempo de Serviço" 
                  value={stats ? new Date(stats.created_at).toLocaleDateString() : "—"} 
                  icon={Clock}
                />
              </div>
            </div>
          </div>
        </PdaPanel>
      </div>

      {/* Progresso de Ranking */}
      <PdaPanel title="PROGRESSÃO DE TIER" className="border-border/40">
        <div className="space-y-4">
          <div className="flex justify-between text-[11px] uppercase tracking-wider font-bold">
            <span className="text-muted-foreground">Progresso Atual</span>
            <span className="text-primary pda-glow">
              {tier >= 4 ? "NÍVEL MÁXIMO" : `${reputation} / ${nextTierThreshold(reputation)} REP`}
            </span>
          </div>
          <div className="h-3 bg-input border border-border/50 relative overflow-hidden rounded-full">
            <div 
              className="h-full bg-gradient-to-r from-primary/50 to-primary transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--pda-glow-rgb),0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          {tier < 4 && (
            <p className="text-[10px] text-muted-foreground italic flex items-center gap-1.5">
              <Info className="h-3 w-3" />
              Faltam {nextTierThreshold(reputation) - reputation} pontos para subir para {TIER_NAMES[tier + 1]}
            </p>
          )}
        </div>
      </PdaPanel>

      {/* Seção de Missões ou Lore */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PdaPanel title="MINHAS MISSÕES" className="h-full border-border/40">
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
            <Target className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Nenhuma missão designada pelo alto comando no momento.
            </p>
          </div>
        </PdaPanel>

        <PdaPanel title="GUIA DO NOVATO" className="h-full border-border/40">
          <div className="space-y-3">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Como um novo membro dos Free Stalkers, você deve se familiarizar com as regras da Zona. 
              Consulte a aba de Lore para entender nossa história.
            </p>
            <button className="w-full flex items-center justify-between group p-2 border border-border/30 bg-input/20 hover:border-primary transition-colors">
              <span className="text-[10px] uppercase font-bold group-hover:text-primary">Ver Lore da Facção</span>
              <ArrowRight className="h-3 w-3 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </button>
            <button className="w-full flex items-center justify-between group p-2 border border-border/30 bg-input/20 hover:border-primary transition-colors">
              <span className="text-[10px] uppercase font-bold group-hover:text-primary">Tabela de Preços</span>
              <ArrowRight className="h-3 w-3 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        </PdaPanel>
      </div>

      {photoModalOpen && (
        <PhotoModal
          onClose={() => setPhotoModalOpen(false)}
          onSave={persistPhoto}
        />
      )}
    </div>
  );
}

function PhotoModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (url: string) => Promise<boolean>;
}) {
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("stalker-photos").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("stalker-photos").getPublicUrl(path);
      setSaving(true);
      await onSave(data.publicUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
      setSaving(false);
    }
  };

  const handleUrl = async () => {
    if (!url.trim()) return;
    setSaving(true);
    try {
      await onSave(url.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="border border-primary/50 bg-card max-w-md w-full p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display uppercase tracking-wider pda-glow text-sm">
            Atualizar Foto do Operador
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Upload className="h-3 w-3" /> Enviar do computador
          </label>
          <input
            type="file"
            accept="image/*"
            disabled={uploading || saving}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="text-xs w-full file:mr-3 file:py-1.5 file:px-3 file:border file:border-primary file:bg-transparent file:text-primary file:uppercase file:text-[10px] file:cursor-pointer hover:file:bg-primary/10"
          />
          {uploading && (
            <div className="text-[10px] text-primary flex items-center gap-1.5 mt-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Enviando...
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] uppercase text-muted-foreground">ou</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <LinkIcon className="h-3 w-3" /> Colar URL externa
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              disabled={uploading || saving}
              className="pda-input flex-1 text-xs"
            />
            <button
              onClick={handleUrl}
              disabled={!url.trim() || uploading || saving}
              className="border border-primary text-primary px-3 py-1.5 text-xs uppercase hover:bg-primary hover:text-primary-foreground disabled:opacity-50 flex items-center gap-1"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color = "text-muted-foreground" }: any) {
  return (
    <div className="bg-input/30 border border-border/30 p-3 flex flex-col items-center text-center group hover:border-primary/30 transition-colors">
      <Icon className={`h-4 w-4 mb-2 ${color} opacity-70 group-hover:opacity-100 transition-opacity`} />
      <div className="text-[10px] uppercase text-muted-foreground font-medium mb-0.5 tracking-tighter">{label}</div>
      <div className="text-sm font-display pda-glow">{value}</div>
    </div>
  );
}
