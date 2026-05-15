# Configuração do Bot no Railway (Projeto XXR)

Para corrigir o erro de envio dos relatórios, acesse o painel do **Railway**, vá em **Variables** no serviço do bot e atualize os campos conforme abaixo.

### 📋 Variáveis para Copiar e Colar

| Variável | Valor (Copie e Cole) |
| :--- | :--- |
| **PDA_API_URL** | `https://pda-free-stalker.vercel.app/api/discord-report` |
| **PDA_WEBHOOK_SECRET** | `dc129c6fb3526e6bb2af6cc8bfc25a412c322650c3e53e2c3c03d8489c781097` |

---

### ⚠️ Verificação Importante no Vercel

Para que os valores acima funcionem, as variáveis no seu **Vercel** devem estar assim:

1.  **DISCORD_WEBHOOK_SECRET**: `dc129c6fb3526e6bb2af6cc8bfc25a412c322650c3e53e2c3c03d8489c781097`
2.  **SUPABASE_URL**: `https://xxrjiqxjktfedngiqksw.supabase.co`
3.  **SUPABASE_SERVICE_ROLE_KEY**: `sb_secret_5QjvrU2lpLCKF-7G9Me4cw_1p6zHL0A`
4.  **VITE_SUPABASE_URL**: `https://xxrjiqxjktfedngiqksw.supabase.co`
5.  **VITE_SUPABASE_PUBLISHABLE_KEY**: `sb_publishable_GiKWnBHVxekjynmsFmenCw_cb4ikXAc`

### 🚀 Como testar após salvar:
1.  Aguarde o Railway terminar o "Redeploy" do bot.
2.  No Discord, abra um ticket e envie um relatório.
3.  O bot deve responder com uma mensagem de sucesso.
4.  Verifique o painel do site; o relatório deve aparecer na aba de **Relatórios Pendentes**.
