import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authSchema, type AuthInput } from "@/lib/schemas";
import { useAuth } from "@/lib/auth-context";
import { PdaShell, PdaPanel } from "./PdaShell";
import { Loader2, Terminal } from "lucide-react";
import { toast } from "sonner";

type Mode = "signin" | "signup";

export function AuthGate() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [submitting, setSubmitting] = useState(false);
  const [signupOk, setSignupOk] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AuthInput>({
    resolver: zodResolver(authSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (data: AuthInput) => {
    setSubmitting(true);
    try {
      if (mode === "signin") {
        await signIn(data.username, data.password);
        toast.success("Acesso autorizado");
      } else {
        await signUp(data.username, data.password, data.steam_id);
        setSignupOk(true);
        reset();
        toast.success("Cadastro enviado. Aguarde aprovação do admin.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PdaShell>
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <Terminal className="h-3 w-3" /> P.D.A. SYSTEM v3.14
            </div>
            <h1 className="font-display text-3xl pda-glow-strong mt-2">FREE STALKERS</h1>
            <div className="text-[11px] text-muted-foreground mt-1">FACTION ACCESS TERMINAL</div>
          </div>

          <PdaPanel>
            <div className="text-xs text-muted-foreground mb-4 uppercase tracking-wider">
              {mode === "signin" ? "▌ Identificar operador" : "▌ Solicitar cadastro"}
            </div>

            {signupOk && mode === "signup" ? (
              <div className="text-sm space-y-3">
                <p className="pda-glow">✓ SOLICITAÇÃO REGISTRADA</p>
                <p className="text-muted-foreground">
                  Aguardando aprovação da conta principal. Você não conseguirá acessar até ser
                  aprovado.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSignupOk(false);
                    setMode("signin");
                  }}
                  className="text-primary underline text-xs uppercase"
                >
                  ← Voltar para login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                    Usuário
                  </label>
                  <input
                    {...register("username")}
                    autoComplete="username"
                    className="w-full bg-input/40 border border-border px-3 py-2 text-sm font-mono outline-none focus:border-primary focus:pda-glow"
                    placeholder="bituca"
                  />
                  {errors.username && (
                    <p className="text-destructive text-[11px] mt-1">{errors.username.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                    Senha
                  </label>
                  <input
                    {...register("password")}
                    type="password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    className="w-full bg-input/40 border border-border px-3 py-2 text-sm font-mono outline-none focus:border-primary focus:pda-glow"
                    placeholder="••••••••"
                  />
                  {errors.password && (
                    <p className="text-destructive text-[11px] mt-1">{errors.password.message}</p>
                  )}
                </div>

                {mode === "signup" && (
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
                      Steam ID
                    </label>
                    <input
                      {...register("steam_id")}
                      className="w-full bg-input/40 border border-border px-3 py-2 text-sm font-mono outline-none focus:border-primary focus:pda-glow"
                      placeholder="76561198..."
                    />
                    {errors.steam_id && (
                      <p className="text-destructive text-[11px] mt-1">{errors.steam_id.message}</p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full border border-primary text-primary py-2 text-sm uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  {mode === "signin" ? "▶ Acessar PDA" : "▶ Solicitar"}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === "signin" ? "signup" : "signin");
                      reset();
                    }}
                    className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-primary"
                  >
                    {mode === "signin"
                      ? "› Não tem cadastro? solicitar acesso"
                      : "› Já tem acesso? login"}
                  </button>
                </div>
              </form>
            )}
          </PdaPanel>

          <p className="text-[10px] text-center text-muted-foreground mt-4">
            ZONA · CORDÃO · FACÇÃO INDEPENDENTE
          </p>
        </div>
      </div>
    </PdaShell>
  );
}
