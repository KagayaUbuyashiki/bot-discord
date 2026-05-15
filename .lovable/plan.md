## 1. Auditoria do Bot Discord

### O que está correto
- `bot/src/tickets/flow.ts`: pergunta `Steam ID` e `Nome do Personagem` no fluxo `register` e pula direto para anexos. ✅
- `bot/src/tickets/submit.ts`: envia `stalker_steam_id`, `character_name`, `discord_user_id`, `discord_username` e `attachments` para `POST /api/public/discord-report`. ✅
- `bot/src/tickets/flow.ts` (`processSubmit`): atribui `config.unofficalRoleId` ao usuário no Discord depois do envio. ✅
- `bot/src/index.ts`: expõe `POST /api/discord-report` (porta 3000) que recebe `approval_notification` e chama `handleApprovalNotification`. ✅
- `bot/src/tickets/approval.ts`: envia DM, **remove** o cargo "não oficial" — porém **não adiciona** um cargo "verificado/oficial" baseado em `role_assigned`.

### O que precisa corrigir / completar
1. **Cargo de aprovação** (`approval.ts`): hoje só remove o `unofficalRoleId`. Precisa mapear `role_assigned` (`iniciado` / `medio` / `high` / `admin`) para um Role ID do Discord e adicionar via `member.roles.add(...)`. Vou exigir 4 novas envs no bot: `DISCORD_ROLE_INICIADO_ID`, `DISCORD_ROLE_MEDIO_ID`, `DISCORD_ROLE_HIGH_ID`, `DISCORD_ROLE_ADMIN_ID`.
2. **Vínculo banco ↔ Steam ID**: o webhook (`src/lib/discord-report-webhook.ts`) já procura `stalkers` por `steam_id` e cria o stalker se não existir no fluxo `register`. Mas insere `discord_user_id` na tabela `stalkers` com `as any` — essa coluna **não existe hoje** na tabela `stalkers` (só está em `pending_reports` e talvez `profiles`). Precisa migration para `ALTER TABLE public.stalkers ADD COLUMN discord_user_id text` e índice único parcial.
3. **URL do bot no webhook**: `discord-report-webhook.ts` linha 145 ainda tem `"https://sua-url-do-bot-no-railway.railway.app/..."` como fallback — precisa virar `process.env.BOT_API_URL` obrigatório (sem fallback fake).

### Como testar (passo a passo)
1. **Health check**: `GET https://<seu-app>.vercel.app/api/public/discord-report/health` → confirma que `SUPABASE_URL`, `SERVICE_ROLE_KEY`, `DISCORD_WEBHOOK_SECRET` estão setados e apontando pro projeto `xxr`.
2. **Simular registro do bot** via cURL (substitui o secret e o steam_id):
   ```bash
   curl -X POST https://<app>.vercel.app/api/public/discord-report \
     -H "Content-Type: application/json" \
     -H "x-webhook-secret: <DISCORD_WEBHOOK_SECRET>" \
     -d '{"type":"register","raw_text":"teste","stalker_steam_id":"76561198000000001","character_name":"Teste Aker","discord_user_id":"123","discord_username":"teste","attachments":[]}'
   ```
   Esperado: `201 {"ok":true,"id":"..."}`. Depois conferir em `stalkers` (deve existir Teste Aker com steam_id) e em `pending_reports` (deve existir registro `source=discord_register`).
3. **Aprovar pelo PDA** (aba Admin) → conferir DM no Discord + remoção do cargo "não oficial" + atribuição do novo cargo (depois da correção #1).
4. **Re-enviar relatório do mesmo Steam ID** → confirmar que `pending_reports.stalker_id` é populado automaticamente (vínculo).

---

## 2. Aba "Meu PDA" — foto

Hoje `MyPdaTab.tsx` usa `prompt()` pra colar URL e tenta atualizar `profiles.photo_url` + `stalkers.photo_url`. Problema: se o registro não veio do bot, o `profile.id` não é o mesmo `id` da `stalkers` — por isso não persiste. Corrigir:

- Trocar o `prompt()` por um modal com **dois caminhos**:
  - **Upload local**: `<input type="file" accept="image/*">` → upload pro bucket `stalker-photos` (já existe e é público) → pega `getPublicUrl`.
  - **URL externa**: campo de texto opcional.
- Persistir SEMPRE em `profiles.photo_url` por `user_id` (fonte da verdade do operador).
- Persistir em `stalkers.photo_url` apenas quando existir um stalker vinculado pelo `steam_id` do profile (`profiles.steam_id` → `stalkers.steam_id`), não pelo `id`.
- Atualizar a leitura de `stats.photo_url` para fazer fallback `profile.photo_url` quando não houver stalker.

---

## 3. Aba "Relatórios" — filtrar registros do bot

`ReportsTab.tsx` mostra todos `pending_reports` com `status=pending`. Os tickets de **registro** entram com `source='discord_register'` e não devem aparecer aqui (eles já viram um stalker e um profile pendente na aba Admin).

- Filtrar a query: `.eq('status','pending').neq('source','discord_register')`.
- Garantir que o webhook continua criando o stalker no banco com as características do ticket (já faz; só precisa da migration para `stalkers.discord_user_id` — ver §1.2).

---

## 4. Aba "Relatórios" — aprovar com missão/stalker faltantes

Hoje, em `ReportsTab.tsx`, se o stalker ou a missão não existem, o moderador trava. Vou adicionar dois botões inline no card:

- **"+ Criar stalker"** (aparece quando `stalker_steam_id` não casa com nenhum) → abre mini-form (nome + foto opcional) → cria via `supabase.from('stalkers').insert(...)` → vincula `pending_reports.stalker_id` automaticamente.
- **"+ Criar missão"** (aparece quando `mission_id` é null e a IA detectou nome de missão) → mini-form (nome, dificuldade, recompensas) → insere em `missions` → vincula `pending_reports.mission_id`.
- O botão **"Aprovar"** já existe e funciona; vou só garantir que aparece habilitado depois que stalker/missão são vinculados (sem precisar reabrir a página — `load()` no fim de cada ação).

---

## Detalhes técnicos

**Migrations necessárias:**
```sql
ALTER TABLE public.stalkers ADD COLUMN IF NOT EXISTS discord_user_id text;
CREATE UNIQUE INDEX IF NOT EXISTS stalkers_discord_user_id_unique
  ON public.stalkers(discord_user_id) WHERE discord_user_id IS NOT NULL;
```

**Arquivos a alterar:**
- `bot/src/config.ts` (4 envs novas pros role IDs)
- `bot/src/tickets/approval.ts` (mapear role_assigned → roleId e adicionar)
- `src/lib/discord-report-webhook.ts` (remover fallback fake do BOT_API_URL; tirar `as any` depois da migration)
- `src/components/tabs/MyPdaTab.tsx` (modal de foto: upload + URL; persistência por steam_id)
- `src/components/tabs/ReportsTab.tsx` (filtrar `discord_register`; botões "criar stalker" e "criar missão")

**Variáveis de ambiente novas no Railway (bot):**
- `DISCORD_ROLE_INICIADO_ID`, `DISCORD_ROLE_MEDIO_ID`, `DISCORD_ROLE_HIGH_ID`, `DISCORD_ROLE_ADMIN_ID`
- `BOT_API_URL` no Vercel (PDA) apontando pro endpoint público do bot no Railway.

**O que NÃO vou mexer:**
- `.env` local do PDA (você pediu pra perguntar antes).
- Edge function legada `supabase/functions/discord-report/` (mantida como fallback).
- Triggers/funções `handle_new_user` (você já aplicou manualmente).

---

## Perguntas antes de implementar

1. Você já tem os Role IDs do Discord pros 4 cargos (iniciado/medio/high/admin)? Se não, posso só implementar a lógica e você cola depois nas envs do Railway?
2. Quer que o modal de foto da aba "Meu PDA" também permita **trocar o nome do personagem / Steam ID** já que você adicionou essas colunas em `profiles`? Ou foto só por enquanto?
3. Para "Criar missão" no card de relatório: usar os campos sugeridos pela IA (`a.matched_stalker_hint`, `tags`) como pré-preenchimento, ou form em branco?