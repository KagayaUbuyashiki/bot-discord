import { useState } from "react";

import { PdaShell } from "./PdaShell";
import { PdaSidebar, type TabId } from "./PdaSidebar";
import { useAuth } from "@/lib/auth-context";
import { StalkersTab } from "@/components/tabs/StalkersTab";
import { MissionsTab } from "@/components/tabs/MissionsTab";
import { RankingTab } from "@/components/tabs/RankingTab";
import { MutantsTab } from "@/components/tabs/MutantsTab";
import { EquipmentTab } from "@/components/tabs/EquipmentTab";
import { LoreTab } from "@/components/tabs/LoreTab";
import { ReportsTab } from "@/components/tabs/ReportsTab";
import { AdminTab } from "@/components/tabs/AdminTab";
import { MyPdaTab } from "@/components/tabs/MyPdaTab";

export function PdaDashboard() {
  const { isAdmin, hasMinRole, profile } = useAuth();
  const isApproved = profile?.status === "approved";
  
  // Se aprovado, começa na aba de Stalkers (Facção). Se não, começa no Meu PDA (Pessoal).
  const [tab, setTab] = useState<TabId>(isApproved ? "stalkers" : "my-pda");

  const renderTab = () => {
    // Permission guard for tabs
    if (tab === "admin" && !isAdmin) return <Denied />;
    if (tab === "reports" && !hasMinRole("medio")) return <Denied />;
    
    // Se o usuário não for aprovado, ele só pode ver abas específicas
    const allowedForUnofficial = ["my-pda", "mutants", "lore"];
    if (!isApproved && !allowedForUnofficial.includes(tab) && !isAdmin) {
      return <MyPdaTab />;
    }

    switch (tab) {
      case "my-pda":
        return <MyPdaTab />;
      case "stalkers":
        return <StalkersTab />;
      case "missions":
        return <MissionsTab />;
      case "ranking":
        return <RankingTab />;
      case "mutants":
        return <MutantsTab />;
      case "equipment":
        return <EquipmentTab />;
      case "lore":
        return <LoreTab />;
      case "reports":
        return <ReportsTab />;
      case "admin":
        return <AdminTab />;
    }
  };

  return (
    <PdaShell>
      <div className="flex min-h-screen w-full">
        <PdaSidebar active={tab} onChange={setTab} />
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">{renderTab()}</div>
        </main>
      </div>
    </PdaShell>
  );
}

function Denied() {
  return (
    <div className="border border-destructive/40 p-6 text-center">
      <div className="text-destructive font-display text-xl">▌ ACESSO NEGADO</div>
      <div className="text-xs text-muted-foreground mt-2 uppercase">
        Privilégios insuficientes para esta área
      </div>
    </div>
  );
}
