# Migração do backend para o projeto Supabase `xxrjiqxjktfedngiqksw`

> **Atenção:** o Lovable Cloud (`lqdb...`) continua tecnicamente conectado ao
> projeto Lovable. Migrations, deploy de Edge Functions e logs feitos pelo
> Lovable continuam indo pro `lqdb`. O `xxr` será gerenciado **manualmente
> por você** pelo dashboard do Supabase. Para reverter, basta apagar
> `.env.local` e restaurar os secrets antigos.

## Checklist completo

### 1. Replicar o schema no `xxr`

1. Abra https://supabase.com/dashboard/project/xxrjiqxjktfedngiqksw/sql/new
2. Cole o conteúdo INTEIRO de `migration-to-xxr.sql`
3. Clique **Run**
4. Confira em **Table Editor** que apareceram: `profiles`, `user_roles`,
   `stalkers`, `missions`, `mission_reports`, `pending_reports`,
   `equipment`, `mutant_prices`, `lore`
5. Em **Storage** confira que existem 3 buckets públicos

### 2. Pegar as keys do `xxr`

Em `xxr` → **Project Settings → API**:

- **Project URL**: `https://xxrjiqxjktfedngiqksw.supabase.co`
- **publishable / anon key**: começa com `sb_publishable_...` ou `eyJ...`
- **secret / service_role key**: começa com `sb_secret_...` ou `eyJ...`
  (em **Settings → API → Project API keys → service_role** — clique em
  "Reveal")

### 3. Atualizar variáveis no Vercel

Vá em **Settings → Environment Variables** no seu projeto `pda-free-stalker` no Vercel e corrija os valores que ainda apontam para o projeto antigo (`lqdb`):

- **VITE_SUPABASE_URL**: mude para `https://xxrjiqxjktfedngiqksw.supabase.co`
- **VITE_SUPABASE_PUBLISHABLE_KEY**: mude para `sb_publishable_GiKWnBHVxekjynmsFmenCw_cb4ikXAc`
- **VITE_SUPABASE_PROJECT_ID**: mude para `xxrjiqxjktfedngiqksw`

### 4. Atualizar o Railway (Bot)

No Railway, o bot está tentando enviar relatórios para o projeto antigo. Mude a variável:

- **PDA_API_URL**: mude para `https://pda-free-stalker.vercel.app/api/discord-report`
  *(Substitua `pda-free-stalker.vercel.app` pela sua URL real de produção do Vercel)*

### 5. Verificar o Secret de Comunicação

Garanta que o valor é EXATAMENTE o mesmo nos dois lugares:
- No Railway: `PDA_WEBHOOK_SECRET`
- No Vercel: `DISCORD_WEBHOOK_SECRET`

Valor atual: `dc129c6fb3526e6bb2af6cc8bfc25a412c322650c3e53e2c3c03d8489c781097`

### 7. Recriar seu usuário e cargo de admin

1. No app (preview), clique em **Sign up** e crie sua conta — ela vai pro `xxr`
2. No dashboard `xxr` → **Authentication → Users**: copie seu `user id`
3. **SQL Editor** → rode:

```sql
-- aprove seu profile
UPDATE public.profiles SET status = 'approved' WHERE user_id = 'COLE_SEU_USER_ID';

-- dê cargo admin
INSERT INTO public.user_roles (user_id, role) VALUES ('COLE_SEU_USER_ID', 'admin');
```

4. Faça logout e login de novo. Agora você tem acesso total.
5. Outros membros: cada um cria conta de novo e você aprova/atribui cargo
   pelo painel admin do app.

### 8. (Opcional) Migrar dados existentes do `lqdb`

Para trazer stalkers, missões, equipamentos etc. do banco antigo:

```sql
-- No SQL Editor do lqdb, exporte cada tabela como CSV usando o botão "Download"
-- após rodar:
SELECT * FROM stalkers;
SELECT * FROM missions;
SELECT * FROM equipment;
SELECT * FROM mutant_prices;
SELECT * FROM lore;
SELECT * FROM mission_reports;
```

Depois no `xxr` → **Table Editor → [tabela] → Insert → Import data from CSV**.

> **Fotos nos buckets**: o Supabase não tem export direto. Use a CLI:
>
> ```bash
> supabase storage cp ss:///stalker-photos ./fotos --recursive --linked-project lqdbjvvdahjvweiezpwh
> supabase storage cp ./fotos ss:///stalker-photos --recursive --linked-project xxrjiqxjktfedngiqksw
> ```

### 9. Verificação final

- [ ] Login funciona (usuário criado no xxr)
- [ ] Aba Stalkers carrega (mesmo que vazia)
- [ ] Bot do Discord envia relatório → aparece em "Relatórios Pendentes"
- [ ] Logs de auth e DB você consulta no dashboard do `xxr` (Lovable não vê mais)

## Reverter para o Lovable Cloud (`lqdb`)

```bash
rm .env.local
```

E no formulário de secrets do Lovable: apague `SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
manuais (ou restaure os valores originais do `lqdb`). Pronto, voltou.
