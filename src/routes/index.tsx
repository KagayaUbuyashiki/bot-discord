import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { AuthGate } from "@/components/pda/AuthGate";
import { PendingGate } from "@/components/pda/PendingGate";
import { PdaDashboard } from "@/components/pda/PdaDashboard";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: IndexRoute,
});

function IndexRoute() {
  // One-shot bootstrap of admin account
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("fs_bootstrap_done")) return;
    sessionStorage.setItem("fs_bootstrap_done", "1");
    fetch("/api/bootstrap-admin", { method: "POST" }).catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <AppRouter />
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--pda-panel)",
            color: "var(--pda-glow)",
            border: "1px solid var(--pda-grid)",
            fontFamily: "var(--font-mono)",
          },
        }}
      />
    </AuthProvider>
  );
}

function AppRouter() {
  const { user, profile, loading } = useAuth();
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 1500);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <AuthGate />;
  if (!profile) {
    if (!waited) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    return <PendingGate />;
  }
  
  // Only rejected users are blocked by the gate. 
  // Pending users now see a limited dashboard.
  if (profile.status === "rejected") return <PendingGate />;
  
  return <PdaDashboard />;
}
