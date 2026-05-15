import { useEffect, useState } from "react";
import { Loader2, Save, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PdaHeader, PdaPanel } from "@/components/pda/PdaShell";

export function LoreTab() {
  const { hasMinRole, user } = useAuth();
  const canEdit = hasMinRole("high");
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [loreId, setLoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("lore")
      .select("id, content, updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setContent(data.content);
      setOriginal(data.content);
      setLoreId(data.id);
      setUpdatedAt(data.updated_at);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onSave = async () => {
    setSaving(true);
    const payload = { content, updated_by: user?.id ?? null };
    const { error } = loreId
      ? await supabase.from("lore").update(payload).eq("id", loreId)
      : await supabase.from("lore").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Lore atualizada");
    setEditing(false);
    load();
  };

  return (
    <div>
      <PdaHeader
        title="Quem Somos — Free Stalkers"
        right={
          canEdit &&
          !editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 border border-primary text-primary px-3 py-1.5 text-xs uppercase hover:bg-primary hover:text-primary-foreground"
            >
              <Pencil className="h-3 w-3" /> Editar
            </button>
          )
        }
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : editing ? (
        <PdaPanel>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="pda-input min-h-[400px] font-mono text-xs"
            placeholder="A facção Free Stalkers nasceu nos confins da Zona..."
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={onSave}
              disabled={saving}
              className="border border-primary text-primary px-4 py-2 text-xs uppercase hover:bg-primary hover:text-primary-foreground disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Salvar
            </button>
            <button
              onClick={() => {
                setContent(original);
                setEditing(false);
              }}
              className="border border-border text-muted-foreground px-4 py-2 text-xs uppercase hover:border-foreground hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        </PdaPanel>
      ) : (
        <PdaPanel>
          {content ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {content}
            </div>
          ) : (
            <div className="text-center text-muted-foreground text-sm py-8">
              Nenhuma lore registrada ainda.
              {canEdit && " Clique em Editar para começar."}
            </div>
          )}
          {updatedAt && (
            <div className="text-[10px] text-muted-foreground mt-4 pt-3 border-t border-border">
              Última atualização: {new Date(updatedAt).toLocaleString()}
            </div>
          )}
        </PdaPanel>
      )}
    </div>
  );
}
