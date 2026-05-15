import {
  Users,
  Target,
  Trophy,
  Skull,
  Wrench,
  BookOpen,
  Inbox,
  Shield,
  LogOut,
} from "lucide-react";
import { useAuth, type AppRole } from "@/lib/auth-context";

export type TabId =
  | "my-pda"
  | "stalkers"
  | "missions"
  | "ranking"
  | "mutants"
  | "equipment"
  | "lore"
  | "reports"
  | "admin";

interface NavItem {
  id: TabId;
  label: string;
  icon: typeof Users;
  minRole?: AppRole;
  adminOnly?: boolean;
  requiresApproval?: boolean;
}

const NAV: NavItem[] = [
  { id: "stalkers", label: "STALKERS", icon: Users, requiresApproval: true },
  { id: "missions", label: "MISSÕES", icon: Target, requiresApproval: true },
  { id: "ranking", label: "RANKING", icon: Trophy, requiresApproval: true },
  { id: "mutants", label: "PREÇOS — MUTANTES", icon: Skull },
  { id: "equipment", label: "EQUIPAMENTOS", icon: Wrench, requiresApproval: true },
  { id: "lore", label: "QUEM SOMOS", icon: BookOpen },
  { id: "reports", label: "RELATÓRIOS PENDENTES", icon: Inbox, minRole: "medio" },
  { id: "admin", label: "ADMIN", icon: Shield, adminOnly: true },
];

export function PdaSidebar({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  const { profile, roles, isAdmin, hasMinRole, signOut } = useAuth();
  const isApproved = profile?.status === "approved";

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-sidebar flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="text-xs text-muted-foreground uppercase tracking-widest">P.D.A. v3.14</div>
        <div className="font-display text-xl pda-glow-strong mt-1">FREE STALKERS</div>
        <div className="text-[10px] text-muted-foreground mt-1">Faction Loner Network</div>
      </div>

      <div className="px-3 py-4">
        <button
          onClick={() => onChange("my-pda")}
          className={`w-full flex items-center justify-between p-3 border transition-all duration-300 ${
            active === "my-pda"
              ? "border-primary bg-primary/10 text-primary pda-glow shadow-[0_0_15px_rgba(var(--pda-glow-rgb),0.2)]"
              : "border-border/40 text-muted-foreground hover:border-primary/50 hover:text-primary"
          }`}
        >
          <div className="flex items-center gap-3">
            <Inbox className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-tighter">
              {isApproved ? "Sincronizar Meus Dados" : "Meu Terminal Pessoal"}
            </span>
          </div>
        </button>
      </div>

      <div className="px-4 py-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-2">
        <div className="h-[1px] flex-1 bg-border/30"></div>
        <span>PDA FACÇÃO</span>
        <div className="h-[1px] flex-1 bg-border/30"></div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map((item) => {
          if (item.adminOnly && !isAdmin) return null;
          if (item.minRole && !hasMinRole(item.minRole) && !isAdmin) return null;
          if (item.requiresApproval && !isApproved && !isAdmin) return null;

          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-xs uppercase tracking-wider border-l-2 transition-colors ${
                isActive
                  ? "border-primary bg-sidebar-accent text-primary pda-glow"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-border p-3 text-[11px]">
        <div className="text-muted-foreground uppercase tracking-tighter">OPERADOR</div>
        <div className="pda-glow font-bold uppercase truncate">{profile?.username}</div>
        <div className="text-muted-foreground mt-1">
          CARGO:{" "}
          <span className={isApproved ? "text-primary" : "text-pda-warn"}>
            {isApproved ? roles[0] ?? "—" : "MEMBRO NÃO OFICIAL"}
          </span>
        </div>
        <button
          onClick={() => signOut()}
          className="mt-2 w-full flex items-center justify-center gap-1.5 border border-border py-1.5 text-muted-foreground hover:text-destructive hover:border-destructive transition-colors text-[10px] uppercase"
        >
          <LogOut className="h-3 w-3" /> SAIR
        </button>
      </div>
    </aside>
  );
}
