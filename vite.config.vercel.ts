// Vite config used ONLY by Vercel deploys.
// The Lovable preview keeps using vite.config.ts (Cloudflare adapter).
//
// Uses the official Nitro plugin, which auto-detects Vercel and emits the
// `.output/` structure Vercel recognizes natively (no api/ wrapper, no
// custom rewrites). Runs on Node.js (Fluid Compute) — required because
// TanStack Start SSR uses Node-only modules incompatible with Edge runtime.
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "@tanstack/react-router"],
  },
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      customViteReactPlugin: true,
    }),
    nitro(),
    viteReact(),
  ],
});
