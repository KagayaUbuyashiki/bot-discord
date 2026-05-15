import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PdaHeader } from "@/components/pda/PdaShell";
import { Check, X, Loader2, Shield, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import type { AppRole } from "@/lib/auth-context";

interface ProfileRow {
  id: string;
  user_id: string;
  username: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

interface RoleRow {
  user_id: string;
  role: AppRole;
}

const ROLE_OPTIONS: AppRole[] = ["iniciado", "medio", "high", "admin"];

export function AdminTab() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [rolesByUser, setRolesByUser] = useState<Record<string, AppRole[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: profs }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    setProfiles((profs ?? []) as ProfileRow[]);
    const map: Record<string, AppRole[]> = {};
    ((roles ?? []) as RoleRow[]).forEach((r) => {
      map[r.user_id] = [...(map[r.user_id] ?? []), r.role];
    });
    setRolesByUser(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (p: ProfileRow, role: AppRole) => {
    setBusy(p.id);
    const { error: e1 } = await supabase
      .from("profiles")
      .update({ status: "approved" })
      .eq("id", p.id);
    if (e1) {
      toast.error(e1.message);
      setBusy(null);
      return;
    }
    // Replace existing roles with the chosen one
    await supabase.from("user_roles").delete().eq("user_id", p.user_id);
    const { error: e2 } = await supabase.from("user_roles").insert({ user_id: p.user_id, role });
    if (e2) toast.error(e2.message);
    else {
      toast.success(`${p.username} aprovado como ${role}`);
      
      // Notificar bot sobre aprovação
      const { data: profileWithDiscord } = await (supabase
        .from("profiles") as any)
        .select("discord_user_id, username")
        .eq("id", p.id)
        .single();

      if (profileWithDiscord?.discord_user_id) {
        fetch("/api/public/discord-report", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-webhook-secret": (window as any).DISCORD_WEBHOOK_SECRET || "",
          },
          body: JSON.stringify({
            type: "approval_notification",
            discord_user_id: profileWithDiscord.discord_user_id,
            discord_username: profileWithDiscord.username,
            role_assigned: role,
          }),
        }).catch(err => console.error("Falha ao notificar bot:", err));
      }
    }
    setBusy(null);
    load();
  };

  const reject = async (p: ProfileRow) => {
    setBusy(p.id);
    const { error } = await supabase.from("profiles").update({ status: "rejected" }).eq("id", p.id);
    if (error) toast.error(error.message);
    else toast.success(`${p.username} rejeitado`);
    setBusy(null);
    load();
  };

  const changeRole = async (p: ProfileRow, role: AppRole) => {
    setBusy(p.id);
    await supabase.from("user_roles").delete().eq("user_id", p.user_id);
    const { error } = await supabase.from("user_roles").insert({ user_id: p.user_id, role });
    if (error) toast.error(error.message);
    else toast.success(`Cargo alterado para ${role}`);
    setBusy(null);
    load();
  };

  const revoke = async (p: ProfileRow) => {
    setBusy(p.id);
    await supabase.from("user_roles").delete().eq("user_id", p.user_id);
    const { error } = await supabase.from("profiles").update({ status: "rejected" }).eq("id", p.id);
    if (error) toast.error(error.message);
    else toast.success(`Acesso revogado de ${p.username}`);
    setBusy(null);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
      </div>
    );
  }

  const pending = profiles.filter((p) => p.status === "pending");
  const approved = profiles.filter((p) => p.status === "approved");
  const rejected = profiles.filter((p) => p.status === "rejected");

  return (
    <div className="space-y-8">
      <div>
        <PdaHeader title={`Cadastros pendentes (${pending.length})`} />
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem solicitações pendentes.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((p) => (
              <PendingRow
                key={p.id}
                p={p}
                busy={busy === p.id}
                onApprove={(role) => approve(p, role)}
                onReject={() => reject(p)}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <PdaHeader title={`Membros ativos (${approved.length})`} />
        <div className="space-y-2">
          {approved.map((p) => (
            <MemberRow
              key={p.id}
              p={p}
              roles={rolesByUser[p.user_id] ?? []}
              busy={busy === p.id}
              onChangeRole={(r) => changeRole(p, r)}
              onRevoke={() => revoke(p)}
            />
          ))}
        </div>
      </div>

      {rejected.length > 0 && (
        <div>
          <PdaHeader title={`Rejeitados (${rejected.length})`} />
          <div className="space-y-1 text-xs text-muted-foreground">
            {rejected.map((p) => (
              <div key={p.id} className="px-2 py-1 border-l-2 border-destructive/50">
                {p.username}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PendingRow({
  p,
  busy,
  onApprove,
  onReject,
}: {
  p: ProfileRow;
  busy: boolean;
  onApprove: (role: AppRole) => void;
  onReject: () => void;
}) {
  const [role, setRole] = useState<AppRole>("iniciado");
  return (
    <div className="border border-border bg-card/50 p-3 flex items-center gap-3 text-sm">
      <div className="flex-1">
        <div className="pda-glow font-bold uppercase">{p.username}</div>
        <div className="text-[11px] text-muted-foreground">
          solicitado em {new Date(p.created_at).toLocaleString()}
        </div>
      </div>
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as AppRole)}
        className="bg-input/40 border border-border px-2 py-1 text-xs uppercase"
        disabled={busy}
      >
        {ROLE_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <button
        onClick={() => onApprove(role)}
        disabled={busy}
        className="border border-primary text-primary px-3 py-1 text-xs uppercase hover:bg-primary hover:text-primary-foreground flex items-center gap-1"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
        Aprovar
      </button>
      <button
        onClick={onReject}
        disabled={busy}
        className="border border-border text-muted-foreground px-3 py-1 text-xs uppercase hover:border-destructive hover:text-destructive flex items-center gap-1"
      >
        <X className="h-3 w-3" />
        Rejeitar
      </button>
    </div>
  );
}

function MemberRow({
  p,
  roles,
  busy,
  onChangeRole,
  onRevoke,
}: {
  p: ProfileRow;
  roles: AppRole[];
  busy: boolean;
  onChangeRole: (role: AppRole) => void;
  onRevoke: () => void;
}) {
  const current = roles[0] ?? "iniciado";
  return (
    <div className="border border-border bg-card/30 p-3 flex items-center gap-3 text-sm">
      <Shield className="h-4 w-4 text-primary" />
      <div className="flex-1">
        <div className="pda-glow font-bold uppercase">{p.username}</div>
        <div className="text-[11px] text-muted-foreground">
          cargo atual: <span className="text-primary">{current}</span>
        </div>
      </div>
      <select
        value={current}
        onChange={(e) => onChangeRole(e.target.value as AppRole)}
        className="bg-input/40 border border-border px-2 py-1 text-xs uppercase"
        disabled={busy}
      >
        {ROLE_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <button
        onClick={onRevoke}
        disabled={busy}
        className="border border-border text-muted-foreground px-3 py-1 text-xs uppercase hover:border-destructive hover:text-destructive flex items-center gap-1"
      >
        <ShieldOff className="h-3 w-3" />
        Revogar
      </button>
    </div>
  );
}
