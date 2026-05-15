import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "bituca@freestalkers.local";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "bituca";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "bituca014";

export const Route = createFileRoute("/api/bootstrap-admin")({
  server: {
    handlers: {
      POST: async () => {
        try {
          // Find existing user by email
          const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 200,
          });
          if (listErr) throw listErr;

          let userId = list.users.find((u) => u.email === ADMIN_EMAIL)?.id ?? null;

          if (!userId) {
            const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
              email: ADMIN_EMAIL,
              password: ADMIN_PASSWORD,
              email_confirm: true,
              user_metadata: { username: ADMIN_USERNAME },
            });
            if (createErr) throw createErr;
            userId = created.user!.id;
          }

          // Ensure profile is approved with username 'bituca'
          await supabaseAdmin.from("profiles").upsert(
            {
              user_id: userId,
              username: ADMIN_USERNAME,
              status: "approved",
            },
            { onConflict: "user_id" },
          );

          // Ensure admin role
          const { data: existingRole } = await supabaseAdmin
            .from("user_roles")
            .select("id")
            .eq("user_id", userId)
            .eq("role", "admin")
            .maybeSingle();
          if (!existingRole) {
            await supabaseAdmin.from("user_roles").insert({
              user_id: userId,
              role: "admin",
            });
          }

          return Response.json({ ok: true, userId });
        } catch (e) {
          const message = e instanceof Error ? e.message : "bootstrap failed";
          console.error("bootstrap-admin error:", message);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
