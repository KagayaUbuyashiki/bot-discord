# Setup rápido — PDA + Bot Discord (caminho recomendado)

A forma mais simples agora é o bot enviar direto para o **backend integrado do Lovable Cloud**, sem precisar configurar Vercel, Supabase externo, ou variáveis extras.

---

## 1. URL do endpoint (bot → PDA)

O endpoint público já está deployado e ativo:

```
https://lqdbjvvdahjvweiezpwh.supabase.co/functions/v1/discord-report
```

Esse endpoint:

- Aceita `GET` para healthcheck (retorna `{"status":"ok"}` se tudo certo).
- Aceita `POST` com header `x-webhook-secret` para gravar relatórios.
- Grava direto na tabela `pending_reports` do banco do PDA.
- Já está vinculado ao projeto correto (`lqdbjvvdahjvweiezpwh`). Não tem como apontar pro banco errado.

**Teste agora no navegador:** abra a URL acima — deve responder `{"status":"ok","secret_set":true,...}`.

---

## 2. Variáveis na **Railway** (bot)

| Nome                         | Valor                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| `DISCORD_TOKEN`              | token do bot (Discord Developer Portal → Bot → Reset Token)                               |
| `DISCORD_CLIENT_ID`          | Application ID (Developer Portal → General Information)                                   |
| `DISCORD_GUILD_ID`           | ID do servidor (Modo Desenvolvedor → clique direito no servidor → Copy ID)                |
| `DISCORD_CATEGORY_ID`        | ID da categoria onde os tickets serão criados                                             |
| `DISCORD_AUTHORIZED_ROLE_ID` | (opcional) cargo que pode ver os tickets                                                  |
| `PDA_API_URL`                | `https://lqdbjvvdahjvweiezpwh.supabase.co/functions/v1/discord-report`                    |
| `PDA_WEBHOOK_SECRET`         | **mesmo valor** que você acabou de salvar como `DISCORD_WEBHOOK_SECRET` no backend do PDA |

> O `PDA_WEBHOOK_SECRET` (Railway) **tem que ser idêntico** ao `DISCORD_WEBHOOK_SECRET` que está salvo no backend integrado. Se mudar um, mude o outro.

Depois de salvar, faça **Deploy/Restart** do serviço na Railway.

---

## 3. Discord Developer Portal

1. https://discord.com/developers/applications → seu app
2. **Bot** → ativar:
   - ✅ Message Content Intent
   - ✅ Server Members Intent
3. **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Manage Channels`, `Send Messages`, `Read Message History`, `Use Slash Commands`, `Embed Links`, `Attach Files`
4. Abra a URL gerada e convide o bot pro seu servidor.

---

## 4. Inicializar o painel

No Discord, no canal onde quer o botão "Abrir relatório":

```
/setup-painel
```

Se o comando não aparecer na hora, espere ~1 min e recarregue o cliente.

---

## 5. Testar o fluxo completo

1. Clique em **Abrir relatório** no painel.
2. Bot cria o canal `relatorio-seunome` e faz as perguntas.
3. Você confirma o envio.
4. No PDA, abra a aba **Relatórios Pendentes** (precisa de cargo `medio`, `high` ou `admin`).
5. O relatório deve aparecer imediatamente. Use o botão **Atualizar** se necessário.

---

## Troubleshooting

| Sintoma                                           | Causa                                                           | Fix                                                          |
| ------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------ |
| GET na URL retorna `missing_env`                  | `DISCORD_WEBHOOK_SECRET` não está salvo no backend do PDA       | Reabra o gerenciador de secrets no Lovable e salve novamente |
| Bot responde "Unauthorized"                       | `PDA_WEBHOOK_SECRET` (Railway) ≠ `DISCORD_WEBHOOK_SECRET` (PDA) | Cole o mesmo valor nos dois e faça redeploy do bot           |
| Bot responde sucesso mas relatório não aparece    | Seu usuário do PDA não tem cargo `medio`+                       | Logue como admin e dê cargo na aba Admin                     |
| Slash command não aparece                         | Bot foi convidado sem `applications.commands`                   | Refaça a OAuth2 URL com o scope correto                      |
| Bot online mas não reage                          | Faltou `Message Content Intent`                                 | Ative no Developer Portal e reinicie o bot                   |
| Aba **Relatórios Pendentes** mostra erro vermelho | Provavelmente RLS / sessão expirada                             | Faça logout/login no PDA                                     |

---

## (Opcional) Continuar usando Vercel

Se você prefere manter o endpoint na Vercel (`/api/public/discord-report`), o código continua funcionando — basta garantir que `SUPABASE_URL` na Vercel aponte para `https://lqdbjvvdahjvweiezpwh.supabase.co` e que `SUPABASE_SERVICE_ROLE_KEY` seja a do mesmo projeto. Mas o caminho recomendado agora é o endpoint do passo 1, que já vem configurado de fábrica.
