# Bot Discord — Visão geral

<<<<<<< HEAD
Passo a passo para colocar o bot de tickets de relatório no ar.
=======

> 🟢 **Pra colocar em produção, siga apenas o [`SETUP-RAPIDO.md`](./SETUP-RAPIDO.md).**
> Este arquivo aqui é só contexto técnico de como o sistema funciona.
>
> > > > > > > c4c6e2605bb415fc77d8a7f7fed0ac5dddd27ee1

## Como funciona

<<<<<<< HEAD

## Visão geral

```
Stalker
  │ clica "Abrir Relatório" no canal #abrir-relatorio
  ▼
Bot cria canal privado #relatorio-fulano
  │
  ▼
Bot conduz conversa: Steam ID → status → missão → detalhes → mutantes → anexos
  │
  ▼
Stalker confirma → bot envia POST pro PDA → canal apagado em 30s
  │
  ▼
Aparece em "Relatórios Pendentes" no PDA → IA analisa → moderador aprova
=======
```

Usuário no Discord
│ clica "Abrir relatório" (botão do /setup-painel)
▼
Bot (Railway, Node)
│ cria canal "relatorio-<nome>"
│ conduz fluxo de perguntas (src/tickets/flow.ts)
▼
POST https://SEU-APP.vercel.app/api/public/discord-report
│ header x-webhook-secret = DISCORD_WEBHOOK_SECRET
▼
PDA (Vercel, TanStack Start)
│ src/lib/discord-report-webhook.ts valida secret + zod
│ usa supabaseAdmin (service role) pra inserir
▼
Tabela public.pending_reports (Lovable Cloud)
│
▼
Aba "Relatórios pendentes" no PDA → mod aprova → vira mission_report

> > > > > > > c4c6e2605bb415fc77d8a7f7fed0ac5dddd27ee1

````

## Endpoints relevantes

<<<<<<< HEAD
## Etapa 1 — Criar a aplicação no Discord (5 min)

1. Acesse https://discord.com/developers/applications
2. Clique em **New Application** → nome **"Free Stalkers PDA"** → **Create**
3. Aba lateral **Bot**:
   - Clique **Reset Token** → copie e guarde (será o `DISCORD_TOKEN`)
   - Role até **Privileged Gateway Intents** e ative:
     - ✅ **Server Members Intent**
     - ✅ **Message Content Intent**
4. Aba **General Information**: copie o **Application ID** (será o `DISCORD_CLIENT_ID`)
5. Aba **OAuth2 → URL Generator**:
   - **Scopes**: `bot` + `applications.commands`
   - **Bot Permissions**:
     - Manage Channels
     - View Channels
     - Send Messages
     - Embed Links
     - Attach Files
     - Read Message History
     - Use Slash Commands
6. Copie a **Generated URL** no rodapé, abra em outra aba, escolha seu servidor e autorize

---

## Etapa 2 — Preparar o servidor Discord (3 min)

1. **Ative o Modo Desenvolvedor** no Discord:
   - Configurações do usuário → **Avançado** → **Modo de desenvolvedor: ON**
2. **Crie a categoria**: clique direito na lista de canais → **Criar Categoria** → nome **"📋 Relatórios"**
3. **Crie o canal público** dentro da categoria: **#abrir-relatorio**
4. **Copie os IDs** (clique direito → "Copiar ID"):
   - **ID do servidor** (clique direito no nome do servidor) → será `DISCORD_GUILD_ID`
   - **ID da categoria "📋 Relatórios"** → será `DISCORD_CATEGORY_ID`
   - (opcional) **ID da role de moderação** que deve ver os tickets → será `DISCORD_AUTHORIZED_ROLE_ID`

---

## Etapa 3 — Subir o bot pra um repositório novo no GitHub

A pasta `bot/` deste projeto contém o código completo. Você precisa colocá-la em um **repositório separado** (não no mesmo do PDA).

```bash
# A partir da raiz do PDA
cp -r bot ~/freestalkers-bot
cd ~/freestalkers-bot
git init
git add .
git commit -m "init bot"
# crie um repo vazio no GitHub e:
git remote add origin https://github.com//freestalkers-bot.git
git branch -M main
git push -u origin main
````

---

## Etapa 4 — Deploy no Railway (5 min, free)

1. Crie conta em https://railway.app (login com GitHub)
2. **New Project → Deploy from GitHub repo** → escolha `freestalkers-bot`
3. O Railway detecta Node.js sozinho e tenta buildar — ignore o erro inicial, vamos configurar as variáveis primeiro
4. Aba **Variables** → adicione todas (uma por uma, **sem aspas**):

| Variável                     | Valor                                                    |
| ---------------------------- | -------------------------------------------------------- |
| `DISCORD_TOKEN`              | (token do passo 1.3)                                     |
| `DISCORD_CLIENT_ID`          | (Application ID do passo 1.4)                            |
| `DISCORD_GUILD_ID`           | (ID do servidor do passo 2.4)                            |
| `DISCORD_CATEGORY_ID`        | (ID da categoria do passo 2.4)                           |
| `DISCORD_AUTHORIZED_ROLE_ID` | (opcional, role de moderação)                            |
| `PDA_API_URL`                | `https://pda-free-stalker.vercel.app/api/discord-report` |
| `PDA_WEBHOOK_SECRET`         | (mesmo valor do `DISCORD_WEBHOOK_SECRET` no Vercel)      |

5. Aba **Settings** → **Service Settings**:
   - **Start Command**: `npm start`
   - **Build Command**: `npm install && npm run build`
6. Clique **Deploy** (ou aguarde redeploy automático)
7. Acompanhe os logs — quando ver `✓ Bot online como Free Stalkers PDA#XXXX`, está funcionando

> **Importante sobre o `PDA_WEBHOOK_SECRET`**: ele já deve estar configurado no Vercel (Settings → Environment Variables). Se você não lembra do valor, pode regenerar: gere um novo segredo aleatório, atualiza nos **dois** lados (Vercel e Railway).

---

## Etapa 5 — Postar o painel no canal

1. Vai pro canal **#abrir-relatorio** no Discord
2. Digite **/setup-painel** e dá enter
3. Bot posta um embed bonitão com o botão **📝 Abrir Relatório**
4. Pronto — esse botão **persiste** mesmo se o bot reiniciar, não precisa repostar

---

## Etapa 6 — Teste end-to-end

1. Clica no botão **📝 Abrir Relatório**
2. Bot cria um canal `#relatorio-seunome` e te marca lá
3. Responde as perguntas (Steam ID, status, missão, relato, dificuldade, mutantes, observações)
4. Na pergunta de anexos: anexa qualquer imagem ou digita `pular`
5. Confere o resumo e clica **✅ Enviar relatório**
6. Vai pro PDA → aba **Relatórios Pendentes** → seu relatório está lá com username Discord + anexos
7. Clica **Analisar com IA** → IA processa → **Aprovar**

---

## Custos

- **Discord**: grátis sempre
- **Railway**: free tier dá $5/mês de crédito. Um bot pequeno como esse consome ~$2-3/mês, então cabe folgado. Cartão de crédito não é exigido pra usar o free tier.

---

## Resolução de problemas

**Bot não responde no canal de ticket**

- Confere os logs no Railway (aba **Deployments → View Logs**)
- Verifica se **Message Content Intent** está ativo no Developer Portal
- Verifica se o ID da categoria está correto

**"Categoria de relatórios não encontrada"**

- O `DISCORD_CATEGORY_ID` está errado. Recopie clicando direito na categoria → "Copiar ID"
- O Modo Desenvolvedor precisa estar ativo no Discord pra opção "Copiar ID" aparecer

**"401 Unauthorized" ao enviar relatório**

- O `PDA_WEBHOOK_SECRET` no Railway é diferente do `DISCORD_WEBHOOK_SECRET` no Vercel
- Os dois valores precisam ser **idênticos**

**Bot online mas não aparece no servidor**

- Você não autorizou no servidor certo. Refaz a Etapa 1.5 com o link OAuth e escolhe seu servidor

**Imagens não aparecem no PDA**

- Confere no banco: as URLs em `pending_reports.attachments` devem começar com `https://cdn.discordapp.com`
- Se aparecem mas não carregam, o link do CDN pode ter expirado (raro, costuma durar bastante tempo)

---

## Variáveis de ambiente — referência rápida

### No Vercel (já configurado do passo anterior)

- `DISCORD_WEBHOOK_SECRET` → mesmo valor do `PDA_WEBHOOK_SECRET` no Railway

### No Railway (bot)

- `DISCORD_TOKEN` → segredo do bot
- `DISCORD_CLIENT_ID` → Application ID
- `DISCORD_GUILD_ID` → ID do servidor
- `DISCORD_CATEGORY_ID` → ID da categoria de relatórios
- `DISCORD_AUTHORIZED_ROLE_ID` → (opcional) role de moderação
- `PDA_API_URL` → URL do endpoint
- # `PDA_WEBHOOK_SECRET` → mesmo valor do `DISCORD_WEBHOOK_SECRET` no Vercel
  | Path                                | Método | Pra que serve                                        |
  | ----------------------------------- | ------ | ---------------------------------------------------- |
  | `/api/public/discord-report`        | POST   | recebe relatório do bot                              |
  | `/api/public/discord-report/health` | GET    | diagnóstico (env, conexão Supabase, insert de teste) |

## Estrutura

- `bot/` — código do bot (Discord.js, TypeScript, deploy Railway)
- `src/lib/discord-report-webhook.ts` — handler compartilhado
- `src/routes/api.public.discord-report.ts` — rota pública (sem auth, só secret)
- `src/routes/api.public.discord-report.health.ts` — diagnóstico
- `src/components/tabs/ReportsTab.tsx` — UI de aprovação no PDA

## Variáveis de ambiente — referência

**PDA (Vercel)**: ver `SETUP-RAPIDO.md` §1.
**Bot (Railway)**: ver `SETUP-RAPIDO.md` §3.

## Troubleshooting

Tudo está no `SETUP-RAPIDO.md` §Troubleshooting express.
A regra geral: **abra `/api/public/discord-report/health`** — o JSON diz exatamente o que arrumar.

> > > > > > > c4c6e2605bb415fc77d8a7f7fed0ac5dddd27ee1
