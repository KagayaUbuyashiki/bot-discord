# Deploy na Vercel (free, sem badge)

Este projeto roda no preview do Lovable com adapter Cloudflare (`vite.config.ts`).
Pra publicar **fora do Lovable** (sem o badge "Edit with Lovable"), use a Vercel
com a config dedicada: `vite.config.vercel.ts` + `vercel.json`.

A config da Vercel usa o plugin oficial **Nitro**, que detecta a Vercel
automaticamente e gera o build no formato que ela reconhece nativamente
(`.output/`). Sem wrappers manuais, sem rewrites — só funciona.

## Passo a passo

### 1. Conectar ao GitHub

No editor Lovable: **Connectors → GitHub → Connect project → Create repository**.

### 2. Importar na Vercel

1. Criar conta free em https://vercel.com (sign up com GitHub)
2. **Add New Project → Import** o repo recém-criado
3. **Framework Preset**: deixar como "Other" (o `vercel.json` já configura)
4. **NÃO clicar Deploy ainda** — primeiro as env vars (passo 3)

### 3. Cadastrar Environment Variables na Vercel

Em **Project Settings → Environment Variables**, adicionar (todas marcadas
para Production + Preview + Development):

| Nome                            | Valor                                      |
| ------------------------------- | ------------------------------------------ |
| `VITE_SUPABASE_URL`             | `https://lqdbjvvdahjvweiezpwh.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | (copiar do `.env`)                         |
| `VITE_SUPABASE_PROJECT_ID`      | `lqdbjvvdahjvweiezpwh`                     |
| `SUPABASE_URL`                  | `https://lqdbjvvdahjvweiezpwh.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY`      | (mesmo do VITE_SUPABASE_PUBLISHABLE_KEY)   |
| `SUPABASE_SERVICE_ROLE_KEY`     | (peça pro Lovable: secret do Cloud)        |
| `LOVABLE_API_KEY`               | (peça pro Lovable: secret do Cloud)        |
| `DISCORD_WEBHOOK_SECRET`        | (gere com `openssl rand -hex 32`)          |

### 4. Deploy

Clicar **Deploy**. A Vercel roda `bun run build:vercel`, o Nitro emite
`.output/public/` (estáticos) + `.output/server/` (Vercel Function Node.js),
e a Vercel publica tudo automaticamente.

URL final: `https://nome-do-repo.vercel.app` — sem badge, sem custo.

### 5. Configurar bot Discord

Apontar o webhook do bot pra:

```
https://nome-do-repo.vercel.app/api/public/discord-report
```

Header: `x-webhook-secret: <valor do DISCORD_WEBHOOK_SECRET>`

## Como funciona

```text
GitHub push
   │
   ▼
Vercel roda `bun run build:vercel`
   │
   ▼
Vite + TanStack Start + Nitro
   │
   ├─► .output/public/   (estáticos: HTML, CSS, JS)  ──►  CDN da Vercel
   └─► .output/server/   (handler SSR)               ──►  Vercel Function
                                                          (Node.js + Fluid Compute)
```

A Fluid Compute escala automática (escala pra zero quando idle, paga só pelo
CPU ativo). No tier free isso é mais que suficiente pro projeto.

## Updates futuros

Cada push no GitHub (vindo do Lovable ou IDE local) → Vercel redeploya em ~1min.
Não precisa mexer em nada depois do setup inicial.

## Troubleshooting

**Erro "unsupported modules" / "Edge Function"**: significa que a Vercel tentou
rodar como Edge. Confirme que o `vite.config.vercel.ts` tem o plugin `nitro()`
ativo e que NÃO existe pasta `api/` no projeto (Nitro gera tudo em `.output/`).

**Build falha com "Cannot find module"**: rode `bun install` localmente,
commite o `bun.lock` atualizado, e faça push. A Vercel respeita o lockfile.
