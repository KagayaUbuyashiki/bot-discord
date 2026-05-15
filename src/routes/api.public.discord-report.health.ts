import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const EXPECTED_PROJECT_REF = "xxrjiqxjktfedngiqksw";
const EXPECTED_URL = `https://${EXPECTED_PROJECT_REF}.supabase.co`;

function maskKey(key: string | undefined): string | null {
  if (!key) return null;
  if (key.length < 16) return "***";
  return `${key.slice(0, 8)}...${key.slice(-6)} (len ${key.length})`;
}

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };
}

export const Route = createFileRoute("/api/public/discord-report/health")({
  server: {
    handlers: {
      GET: async () => {
        const url = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const secret = process.env.DISCORD_WEBHOOK_SECRET;

        const result: Record<string, unknown> = {
          checked_at: new Date().toISOString(),
          expected_supabase_url: EXPECTED_URL,
          env: {
            SUPABASE_URL: url ?? null,
            SUPABASE_URL_matches_expected: url === EXPECTED_URL,
            SUPABASE_SERVICE_ROLE_KEY: maskKey(serviceKey),
            DISCORD_WEBHOOK_SECRET_set: Boolean(secret),
            DISCORD_WEBHOOK_SECRET_length: secret?.length ?? 0,
          },
        };

        if (!url || !serviceKey) {
          result.status = "missing_env";
          result.fix =
            "Adicione SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no deploy do PDA (Vercel).";
          return new Response(JSON.stringify(result, null, 2), {
            status: 500,
            headers: corsHeaders(),
          });
        }

        if (url !== EXPECTED_URL) {
          result.status = "wrong_supabase_project";
          result.fix = `SUPABASE_URL aponta pro projeto errado. Troque pelo valor exato: ${EXPECTED_URL}`;
          return new Response(JSON.stringify(result, null, 2), {
            status: 500,
            headers: corsHeaders(),
          });
        }

        // Try a real query against the live database.
        const admin = createClient(url, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const checks: Record<string, unknown> = {};

        const stalkers = await admin.from("stalkers").select("id").limit(1);
        checks.can_read_stalkers = !stalkers.error;
        if (stalkers.error) {
          checks.stalkers_error = {
            code: stalkers.error.code,
            message: stalkers.error.message,
          };
        }

        const insertProbe = await admin
          .from("pending_reports")
          .insert({
            source: "healthcheck",
            raw_text: "health probe — safe to delete",
            status: "pending",
          })
          .select("id")
          .single();

        checks.can_insert_pending_reports = !insertProbe.error;
        if (insertProbe.error) {
          checks.insert_error = {
            code: insertProbe.error.code,
            message: insertProbe.error.message,
            hint: insertProbe.error.hint,
          };
        } else if (insertProbe.data?.id) {
          await admin.from("pending_reports").delete().eq("id", insertProbe.data.id);
          checks.cleanup_ok = true;
        }

        result.checks = checks;
        result.status =
          checks.can_read_stalkers && checks.can_insert_pending_reports
            ? "ok"
            : "database_unreachable_or_misconfigured";

        return new Response(JSON.stringify(result, null, 2), {
          status: result.status === "ok" ? 200 : 500,
          headers: corsHeaders(),
        });
      },
    },
  },
});
