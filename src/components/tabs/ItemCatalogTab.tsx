import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X, Loader2, Trash2, Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { itemSchema, type ItemInput } from "@/lib/schemas";
import { PdaHeader, PdaPanel } from "@/components/pda/PdaShell";

interface Item {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
}

interface Props {
  title: string;
  table: "mutant_prices" | "equipment";
  bucket: "mutant-images" | "equipment-images";
  emptyHint: string;
}

export function ItemCatalogTab({ title, table, bucket, emptyHint }: Props) {
  const { hasMinRole } = useAuth();
  const canEdit = hasMinRole("medio");
  const canDelete = hasMinRole("high");

  const [list, setList] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(table)
      .select("id, name, price, image_url")
      .order("name");
    if (error) toast.error(error.message);
    setList((data as Item[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [table]);

  const onDelete = async (id: string) => {
    if (!confirm("Remover item?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido");
    load();
  };

  return (
    <div>
      <PdaHeader
        title={`${title} — ${list.length}`}
        right={
          canEdit && (
            <button
              onClick={() => {
                setShowForm((v) => !v);
                setEditing(null);
              }}
              className="flex items-center gap-1.5 border border-primary text-primary px-3 py-1.5 text-xs uppercase hover:bg-primary hover:text-primary-foreground"
            >
              {showForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              {showForm ? "Cancelar" : "Cadastrar"}
            </button>
          )
        }
      />

      {(showForm || editing) && canEdit && (
        <div className="mb-4">
          <ItemForm
            table={table}
            bucket={bucket}
            item={editing}
            onSaved={() => {
              setShowForm(false);
              setEditing(null);
              load();
            }}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : list.length === 0 ? (
        <div className="text-center text-muted-foreground text-sm py-12 border border-dashed border-border">
          {emptyHint}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {list.map((it) => (
            <PdaPanel key={it.id}>
              <div className="aspect-square border border-border bg-input/40 mb-2 overflow-hidden flex items-center justify-center">
                {it.image_url ? (
                  <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-muted-foreground text-[10px]">SEM IMAGEM</span>
                )}
              </div>
              <div className="font-display text-sm pda-glow uppercase truncate">{it.name}</div>
              <div className="text-xs text-pda-warn mt-1">₽ {it.price.toLocaleString()}</div>
              {canEdit && (
                <div className="flex gap-1 mt-2">
                  <button
                    onClick={() => {
                      setEditing(it);
                      setShowForm(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 border border-border text-muted-foreground hover:text-primary hover:border-primary py-1 text-[10px] uppercase"
                  >
                    <Pencil className="h-3 w-3" /> Editar
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => onDelete(it.id)}
                      className="border border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground px-2 py-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </PdaPanel>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemForm({
  table,
  bucket,
  item,
  onSaved,
  onCancel,
}: {
  table: "mutant_prices" | "equipment";
  bucket: "mutant-images" | "equipment-images";
  item: Item | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ItemInput>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: item?.name ?? "",
      price: item?.price ?? 0,
      image_url: item?.image_url ?? "",
    },
  });

  const photoUrl = watch("image_url");

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      setValue("image_url", data.publicUrl, { shouldValidate: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (d: ItemInput) => {
    setSubmitting(true);
    const payload = {
      name: d.name,
      price: d.price,
      image_url: d.image_url || null,
    };
    const { error } = item
      ? await supabase.from(table).update(payload).eq("id", item.id)
      : await supabase.from(table).insert(payload);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(item ? "Atualizado" : "Cadastrado");
    onSaved();
  };

  return (
    <PdaPanel>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
        ▌ {item ? "Editar item" : "Novo item"}
      </div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs"
      >
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Nome
          </label>
          <input {...register("name")} className="pda-input" />
          {errors.name && (
            <p className="text-destructive text-[10px] mt-1">{errors.name.message}</p>
          )}
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Preço (rublos)
          </label>
          <input
            type="number"
            {...register("price", { valueAsNumber: true })}
            className="pda-input"
          />
          {errors.price && (
            <p className="text-destructive text-[10px] mt-1">{errors.price.message}</p>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Imagem (upload)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
              className="text-[10px]"
            />
            {uploading && <Loader2 className="h-3 w-3 animate-spin" />}
            {photoUrl && (
              <img src={photoUrl} alt="" className="h-10 w-10 object-cover border border-border" />
            )}
          </div>
        </div>
        <div className="md:col-span-2 flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="border border-primary text-primary px-4 py-2 text-xs uppercase hover:bg-primary hover:text-primary-foreground disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
            <Check className="h-3 w-3" /> {item ? "Salvar" : "Cadastrar"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="border border-border text-muted-foreground px-4 py-2 text-xs uppercase hover:border-foreground hover:text-foreground"
          >
            Cancelar
          </button>
        </div>
      </form>
    </PdaPanel>
  );
}
