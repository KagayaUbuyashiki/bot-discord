# PDA Free Stalkers — Overview do Projeto

> Documento vivo. Última atualização: backend migrado para Supabase `xxrjiqxjktfedngiqksw` (gerenciado fora do Lovable), frontend hospedado no Vercel, bot Discord no Railway.

## 1. O que é o projeto

Aplicação web tipo "P.D.A." (Personal Digital Assistant, no estilo do jogo S.T.A.L.K.E.R.) para gerenciar uma facção do servidor "Free Stalkers". Centraliza:

- Cadastro de membros (stalkers) com fotos, reputação e medalhas (`badge_tier`)
- Missões com dificuldade, recompensa em dinheiro e reputação
- Relatórios de missão (com IA)
- Catálogo de preços de mutantes e equipamentos
- Lore da facção
- Aprovação de novos membros via cargos hierárquicos
- Integração com bot do Discord para abertura de relatórios via ticket

## 2. Stack técnica

| Camada | Tecnologia |
|---|---|
| Frontend | TanStack Start v1 (React 19, file-based routing), Vite 7 |
| UI | Tailwind v4, shadcn/ui, design escuro tipo terminal "PDA glow" |
| Backend (server fns / API routes) | TanStack Start (mesmo runtime do frontend, deploy serverless no Vercel) |
| Banco | Supabase Postgres (projeto `xxrjiqxjktfedngiqksw`) |
| Autenticação | Supabase Auth (email + senha; `username` é convertido em email fake `username@pda.freestalkers.com`) |
| Storage | Supabase Storage (3 buckets públicos) |
| IA | Lovable AI Gateway (Gemini/GPT) — usado em `src/lib/ai-reports.functions.ts` |
| Bot Discord | Node 18 + discord.js, hospedado no **Railway** |
| Hosting frontend | **Vercel** (`pda-free-stalker.vercel.app`) |
| Edge Function legada | `supabase/functions/discord-report` (mantida como fallback, **não em uso**) |

## 3. Diagrama do fluxo principal

```text
┌──────────┐  /comando ou ticket   ┌──────────────┐
│ Discord  │ ───────────────────►  │  Bot Node    │  (Railway)
└──────────┘                       └──────┬───────┘
                                          │ POST + x-webhook-secret
                                          ▼
                          PDA_API_URL = https://...vercel.app/api/public/discord-report
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ Vercel — TanStack Start                                         │
│  src/routes/api.public.discord-report.ts ─► handleDiscord...()  │
│                                                  │              │
│                                          supabaseAdmin (RLS off)│
│                                                  ▼              │
│                                         INSERT pending_reports  │
└──────────────────────────────────────────────────┬──────────────┘
                                                   │
                                                   ▼
                                  ┌──────────────────────────────┐
                                  │ Supabase xxr — Postgres      │
                                  │  • profiles, user_roles      │
                                  │  • stalkers, missions        │
                                  │  • mission_reports           │
                                  │  • pending_reports           │
                                  │  • equipment, mutant_prices  │
                                  │  • lore                      │
                                  │  • Storage: stalker-photos,  │
                                  │    mutant-images,            │
                                  │    equipment-images          │
                                  └──────────────────────────────┘
                                                   ▲
                                                   │ supabase-js (publishable key + RLS)
                                                   │
                                  ┌──────────────────────────────┐
                                  │ Browser (preview/Vercel)     │
                                  │ React app — abas do PDA      │
                                  └──────────────────────────────┘
```

## 4. Modelo de cargos (autorização)

Hierarquia (do menor pro maior):

| Cargo | Rank | O que pode fazer |
|---|---|---|
| `iniciado` | 1 | Aprovado, vê dados básicos |
| `medio` | 2 | + criar/editar stalkers, missões, equipamentos, mutantes, aprovar relatórios pendentes |
| `high` | 3 | + deletar stalkers/missões/equipamentos/mutantes/relatórios + editar lore |
| `admin` | 4 | + gerenciar `user_roles`, aprovar/rejeitar profiles |

Toda autorização é feita por **funções `SECURITY DEFINER`** no Postgres:

- `is_approved(uid)` → `profiles.status = 'approved'`
- `has_role(uid, role)`
- `has_min_role(uid, min)` → comparação numérica via CASE

E aplicada via RLS em cada tabela.

> **Importante:** quando alguém se cadastra, o trigger `on_auth_user_created` cria automaticamente um `profile` com `status = 'pending'`. O usuário fica preso na tela "PendingGate" até um admin aprovar.

## 5. Tabelas e propósito

| Tabela | Propósito | RLS |
|---|---|---|
| `profiles` | Dados do usuário (username, status pending/approved/rejected) | self-view + approved-view + admin-update |
| `user_roles` | Cargos por usuário (1-N) | self-view + approved-view + admin-manage |
| `stalkers` | Membros da facção (steam_id, foto, reputação, badge_tier auto) | view = approved, write = medio+, delete = high+ |
| `missions` | Missões disponíveis ou completadas | view = approved, write = medio+, delete = high+ |
| `mission_reports` | Relatórios de missão **aprovados** com classificação | view = approved, insert = medio+, delete = high+ |
| `pending_reports` | Relatórios crus **vindos do Discord** (ainda não validados) | view = approved, update/delete = medio+, **insert apenas via service-role** |
| `equipment` | Catálogo de itens com preço e foto | view = approved, write = medio+, delete = high+ |
| `mutant_prices` | Catálogo de mutantes com preço por bicho | view = approved, write = medio+, delete = high+ |
| `lore` | Texto único editável (quem somos) | view = approved, update = high+ |

Triggers automáticos:
- `set_updated_at` em todas as tabelas com `updated_at`
- `compute_badge_tier` em `stalkers` (badge sobe a cada 1000 reputação, máx 4)
- `handle_new_user` em `auth.users` (cria profile pending)

## 6. Buckets de storage

Todos públicos pra leitura, upload restrito a usuários `approved`:

- `stalker-photos`
- `mutant-images`
- `equipment-images`

## 7. Estrutura de arquivos relevantes

```text
src/
├── routes/
│   ├── __root.tsx                          ← shell + AuthProvider
│   ├── index.tsx                           ← single-page com tabs (PdaShell)
│   ├── api.discord-report.ts               ← rota interna (mesma lógica)
│   ├── api.public.discord-report.ts        ← endpoint público p/ bot Railway
│   ├── api.public.discord-report.health.ts ← healthcheck (GET)
│   └── api.bootstrap-admin.ts              ← rota one-shot p/ promover 1º admin
├── components/
│   ├── pda/
│   │   ├── AuthGate.tsx                    ← bloqueia se não logado
│   │   ├── PendingGate.tsx                 ← bloqueia se status != approved
│   │   ├── PdaShell.tsx                    ← layout sidebar + tab content
│   │   ├── PdaSidebar.tsx                  ← navegação lateral por cargo
│   │   └── PdaDashboard.tsx
│   └── tabs/
│       ├── MyPdaTab.tsx       ← terminal pessoal (todos)
│       ├── StalkersTab.tsx    ← lista de membros (approved)
│       ├── MissionsTab.tsx    ← missões (approved)
│       ├── RankingTab.tsx     ← top stalkers (approved)
│       ├── MutantsTab.tsx     ← preços (todos)
│       ├── EquipmentTab.tsx   ← catálogo (approved)
│       ├── LoreTab.tsx        ← quem somos (todos)
│       ├── ReportsTab.tsx     ← pending_reports (medio+)
│       └── AdminTab.tsx       ← gestão de usuários (admin)
├── lib/
│   ├── auth-context.tsx       ← AuthProvider + hook useAuth
│   ├── discord-report-webhook.ts  ← handler único do webhook (Zod, lookup stalker, insert)
│   ├── ai-reports.functions.ts    ← server fns chamando Lovable AI
│   └── badges.ts                  ← cálculo de medalhas
└── integrations/supabase/
    ├── client.ts          ← browser (publishable key)
    ├── client.server.ts   ← admin (service role) — bypassa RLS
    ├── auth-middleware.ts ← middleware p/ server fns autenticadas
    └── types.ts           ← tipos gerados do schema (auto)

bot/
├── src/
│   ├── index.ts                    ← entrypoint Discord
│   ├── config.ts                   ← lê env vars do Railway
│   ├── commands/
│   │   ├── setup-acesso.ts         ← cria botões de cadastro
│   │   └── setup-relatorio.ts      ← cria botões de relatório
│   └── tickets/
│       ├── flow.ts                 ← cria canal de ticket por categoria
│       ├── state.ts                ← guarda estado do ticket em memória
│       ├── submit.ts               ← envia POST p/ Vercel
│       └── approval.ts             ← recebe sinal de aprovação

supabase/
├── config.toml                     ← project_id (lqdb, herança Lovable Cloud — não usado em runtime)
└── functions/discord-report/       ← Edge Function legada, mantida como fallback
```

## 8. Validações implementadas

### 8.1 Webhook do Discord (`src/lib/discord-report-webhook.ts`)

- Header `x-webhook-secret` deve bater com `process.env.DISCORD_WEBHOOK_SECRET`
- Body validado por Zod:
  - `type`: `"report" | "register" | "approval_notification"` (default `"report"`)
  - `raw_text`: 1–8000 chars
  - `stalker_steam_id`: ≤64 chars
  - `mission_id`: UUID
  - `attachments`: array de URLs ≤10 itens
  - `discord_user_id` / `discord_username` / `discord_channel_id`: limites de tamanho
- Erros traduzidos pra mensagem humana (RLS, schema cache, enum inválido, tabela inexistente)

### 8.2 Auth do app

- Username convertido em email pseudo (`username@pda.freestalkers.com`)
- Fallback pro sufixo antigo `@freestalkers.local` em login (legacy)
- 3 gates em sequência: `AuthGate` (logado) → `PendingGate` (approved) → tab por `minRole/adminOnly`
- Tudo no client é **dobrado** com RLS no banco — frontend não consegue burlar

### 8.3 Banco

- `UNIQUE (user_id, role)` em `user_roles` → não duplica cargo
- `ON CONFLICT DO NOTHING` em `handle_new_user` → seguro mesmo se trigger rodar 2×
- Triggers `BEFORE INSERT/UPDATE` em `stalkers` recalculam `badge_tier` a partir de `reputation`

## 9. Variáveis de ambiente — onde cada uma vive

| Lugar | Variável | Valor esperado |
|---|---|---|
| Vercel (Production) | `SUPABASE_URL` | `https://xxrjiqxjktfedngiqksw.supabase.co` |
| Vercel | `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` do xxr |
| Vercel | `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_GiKWnBHV...` do xxr |
| Vercel | `VITE_SUPABASE_URL` | `https://xxrjiqxjktfedngiqksw.supabase.co` |
| Vercel | `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_GiKWnBHV...` |
| Vercel | `VITE_SUPABASE_PROJECT_ID` | `xxrjiqxjktfedngiqksw` |
| Vercel | `DISCORD_WEBHOOK_SECRET` | `dc129c6f...c781097` |
| Vercel | `LOVABLE_API_KEY` | (auto, do Lovable AI) |
| Railway (bot) | `DISCORD_TOKEN` | token do app Discord |
| Railway | `DISCORD_CLIENT_ID` | id do app |
| Railway | `DISCORD_GUILD_ID` | id do servidor |
| Railway | `DISCORD_CATEGORY_ID` | categoria onde tickets abrem |
| Railway | `PDA_API_URL` | `https://pda-free-stalker.vercel.app/api/public/discord-report` |
| Railway | `PDA_WEBHOOK_SECRET` | **mesmo valor** do `DISCORD_WEBHOOK_SECRET` no Vercel |
| Lovable preview (`.env`) | mistura — ver seção 10 | mistura, frontend ainda aponta lqdb |

## 10. Estado atual e pendências conhecidas

### ✅ Concluído
- Schema do `xxr` replicado via `migration-to-xxr.sql`
- CLI Supabase linkada ao `xxr`
- Vercel atualizado pra apontar pro `xxr`
- Railway com `PDA_API_URL` apontando pro Vercel
- `MIGRACAO-XXR.md` e `SETUP-RAILWAY.md` documentados
- Endpoint `/api/public/discord-report/health` criado pra diagnóstico
- Mensagens de erro do webhook traduzem causas comuns

### ⚠️ Pendências
1. **Inconsistência no `.env` local** (preview do Lovable):
   - `SUPABASE_URL` → xxr ✓
   - `VITE_SUPABASE_URL` → ainda **lqdb** ✗
   - `VITE_SUPABASE_PROJECT_ID` → ainda **lqdb** ✗
   - `VITE_SUPABASE_PUBLISHABLE_KEY` → anon key do **lqdb** ✗
   - **Impacto:** no preview do Lovable, browser fala com lqdb e servidor com xxr → quebra. Em produção (Vercel) está OK porque você ajustou lá.
2. **Erro de produção ainda ativo** — bot envia mas algo falha. Diagnóstico depende de:
   - Resposta de `/api/public/discord-report/health` em produção
   - Texto exato do erro retornado ao bot
   - Confirmação que `migration-to-xxr.sql` rodou sem erros no `xxr`
3. **Tipos do Supabase (`src/integrations/supabase/types.ts`)** desatualizados em relação ao schema real do `xxr` — gera erros de build atuais em `AdminTab.tsx` (coluna `discord_user_id` em `profiles`) e `discord-report-webhook.ts` (campos `name` em `stalkers`, `source` em `pending_reports`). Resolver regerando os tipos via CLI: `supabase gen types typescript --project-id xxrjiqxjktfedngiqksw > src/integrations/supabase/types.ts`.
4. **Edge Function `supabase/functions/discord-report`** — código existe mas não está em uso (mantida como fallback)
5. **`supabase/config.toml`** ainda tem `project_id = "lqdbjvvdahjvweiezpwh"` (herança do Lovable Cloud — não afeta runtime do Vercel/xxr, só a CLI local quando não há `--project-ref`)

## 11. Como testar o fluxo end-to-end

1. **Healthcheck:** abrir `https://pda-free-stalker.vercel.app/api/public/discord-report/health` → deve retornar `{"status":"ok","secret_set":true}`
2. **Discord:** abrir um ticket de relatório com o bot
3. **Bot:** deve responder sucesso e gerar `pending_reports.id`
4. **App:** logar como `medio+` → aba "Relatórios Pendentes" → relatório novo aparece
5. **Aprovação:** ao aprovar, vira `mission_report` e o stalker ganha reputação/badge

## 12. Como rodar localmente (dev)

```bash
bun install
bun run dev          # frontend + server fns na mesma porta
cd bot && npm i && npm run dev   # bot (precisa do .env do bot)
```

Healthcheck local: `http://localhost:3000/api/public/discord-report/health`

## 13. Reverter pro Lovable Cloud (rollback total)

Se decidir voltar ao backend antigo (`lqdb`):

1. Restaurar valores originais no Vercel (`SUPABASE_URL`, `VITE_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`)
2. No Railway, mudar `PDA_API_URL` de volta pra Edge Function: `https://lqdbjvvdahjvweiezpwh.supabase.co/functions/v1/discord-report`
3. `supabase link --project-ref lqdbjvvdahjvweiezpwh`

Nada precisa mudar no código do app (ele lê de env vars).
