import { createFileRoute } from "@tanstack/react-router";
import { discordReportCorsHeaders, handleDiscordReportWebhook } from "@/lib/discord-report-webhook";

export const Route = createFileRoute("/api/public/discord-report")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: discordReportCorsHeaders }),
      POST: async ({ request }) => handleDiscordReportWebhook(request),
    },
  },
});
