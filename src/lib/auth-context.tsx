import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "high" | "medio" | "iniciado";
export type ProfileStatus = "pending" | "approved" | "rejected";

export interface AuthProfile {
  id: string;
  user_id: string;
  username: string;
  status: ProfileStatus;
  reputation?: number;
  photo_url?: string | null;
  created_at?: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: AuthProfile | null;
  roles: AppRole[];
  loading: boolean;
  isApproved: boolean;
  isAdmin: boolean;
  hasMinRole: (min: AppRole) => boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string, steam_id?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const ROLE_RANK: Record<AppRole, number> = {
  admin: 4,
  high: 3,
  medio: 2,
  iniciado: 1,
};

const AuthContext = createContext<AuthState | undefined>(undefined);

const usernameToEmail = (username: string) => `${username.toLowerCase()}@pda.freestalkers.com`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfileAndRoles = async (userId: string) => {
    const [{ data: prof }, { data: rolesRows }, { data: stalker }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("stalkers").select("reputation").eq("id", userId).maybeSingle(),
    ]);
    
    if (prof) {
      setProfile({
        ...(prof as AuthProfile),
        reputation: stalker?.reputation ?? 0
      });
    } else {
      setProfile(null);
    }
    
    setRoles((rolesRows ?? []).map((r: { role: AppRole }) => r.role));
  };

  useEffect(() => {
    // 1. Set up listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // defer to avoid deadlock
        setTimeout(() => {
          loadProfileAndRoles(sess.user.id);
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    // 2. THEN check existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfileAndRoles(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = async () => {
    if (user) await loadProfileAndRoles(user.id);
  };

  const signIn = async (username: string, password: string) => {
    // Tenta primeiro com o sufixo novo (.com)
    let { error } = await supabase.auth.signInWithPassword({
      email: `${username.toLowerCase()}@pda.freestalkers.com`,
      password,
    });

    // Se falhar, tenta com o sufixo antigo (.local) para não deslogar usuários antigos
    if (error) {
      const { error: oldError } = await supabase.auth.signInWithPassword({
        email: `${username.toLowerCase()}@freestalkers.local`,
        password,
      });
      if (oldError) throw oldError;
    }
  };

  const signUp = async (username: string, password: string, steam_id?: string) => {
    const { error } = await supabase.auth.signUp({
      email: usernameToEmail(username),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          username,
          steam_id,
        },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isApproved = profile?.status === "approved";
  const isAdmin = roles.includes("admin");
  const hasMinRole = (min: AppRole) => roles.some((r) => ROLE_RANK[r] >= ROLE_RANK[min]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        loading,
        isApproved,
        isAdmin,
        hasMinRole,
        signIn,
        signUp,
        signOut,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
