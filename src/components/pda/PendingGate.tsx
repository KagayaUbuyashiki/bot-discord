import { useAuth } from "@/lib/auth-context";
import { PdaPanel, PdaShell } from "./PdaShell";
import { AlertTriangle, LogOut, RefreshCw } from "lucide-react";

export function PendingGate() {
  const { profile, signOut, refresh } = useAuth();
  const rejected = profile?.status === "rejected";

  return (
    <PdaShell>
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <PdaPanel>
            <div className="flex items-start gap-3">
              <AlertTriangle
                className={`h-6 w-6 shrink-0 ${rejected ? "text-destructive" : "text-pda-warn"}`}
              />
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  STATUS DO OPERADOR
                </div>
                <h2 className="font-display text-xl pda-glow mt-1">
                  {rejected ? "ACESSO NEGADO" : "AGUARDANDO APROVAÇÃO"}
                </h2>
                <p className="text-sm text-muted-foreground mt-3">
                  Operador <span className="text-primary">{profile?.username}</span> —
                  {rejected
                    ? " sua solicitação foi rejeitada pela liderança da facção."
                    : " sua solicitação está na fila do admin. Você verá o painel assim que for aprovado."}
                </p>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => refresh()}
                    className="flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs uppercase hover:border-primary hover:text-primary"
                  >
                    <RefreshCw className="h-3 w-3" /> Verificar
                  </button>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs uppercase hover:border-destructive hover:text-destructive"
                  >
                    <LogOut className="h-3 w-3" /> Sair
                  </button>
                </div>
              </div>
            </div>
          </PdaPanel>
        </div>
      </div>
    </PdaShell>
  );
}
