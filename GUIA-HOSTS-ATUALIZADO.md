# 🛠️ Guia de Configuração Final - PDA Free Stalkers

Este documento contém todas as variáveis e configurações necessárias para que o Bot (Railway), o Site (Vercel) e o Banco de Dados (Supabase) funcionem perfeitamente em conjunto.

---

## 1. 🚀 Configuração no Vercel (Site)

Acesse **Settings -> Environment Variables** e garanta que estas 6 variáveis estejam configuradas exatamente assim:

| Variável | Valor (Copie e Cole) |
| :--- | :--- |
| **DISCORD_WEBHOOK_SECRET** | `dc129c6fb3526e6bb2af6cc8bfc25a412c322650c3e53e2c3c03d8489c781097` |
| **SUPABASE_URL** | `https://xxrjiqxjktfedngiqksw.supabase.co` |
| **SUPABASE_SERVICE_ROLE_KEY** | `sb_secret_5QjvrU2lpLCKF-7G9Me4cw_1p6zHL0A` |
| **VITE_SUPABASE_URL** | `https://xxrjiqxjktfedngiqksw.supabase.co` |
| **VITE_SUPABASE_PUBLISHABLE_KEY** | `sb_publishable_GiKWnBHVxekjynmsFmenCw_cb4ikXAc` |
| **VITE_SUPABASE_PROJECT_ID** | `xxrjiqxjktfedngiqksw` |

> **⚠️ IMPORTANTE:** Após salvar as variáveis no Vercel, você **DEVE** ir na aba **Deployments** e fazer um **Redeploy** do último build para que as mudanças entrem em vigor.

---

## 2. 🤖 Configuração no Railway (Bot)

Acesse o painel do **Railway**, vá em **Variables** do serviço do bot e atualize:

| Variável | Valor (Copie e Cole) |
| :--- | :--- |
| **PDA_API_URL** | `https://pda-free-stalker.vercel.app/api/discord-report` |
| **PDA_WEBHOOK_SECRET** | `dc129c6fb3526e6bb2af6cc8bfc25a412c322650c3e53e2c3c03d8489c781097` |
| **DISCORD_UNOFFICIAL_ROLE_ID** | (ID do cargo 'Membro Não Oficial' no seu Discord) |
| **PORT** | `3000` |

---

## 3. 🐘 Configuração no Supabase (SQL Editor)

Para que o sistema de Steam ID e a criação de perfis automáticos funcionem, rode este script **inteiro** no seu SQL Editor:

```sql
-- 1. Permissões de Acesso
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT INSERT ON public.profiles TO supabase_auth_admin;

-- 2. Estrutura da Tabela
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS steam_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS discord_user_id TEXT;
ALTER TABLE public.stalkers ADD COLUMN IF NOT EXISTS discord_user_id TEXT;

-- 3. Função de Automação de Perfil (Atualizada para Steam ID)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, steam_id, photo_url, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'steam_id',
    NULL,
    'pending'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 4. Reativação do Gatilho
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 4. ✅ Teste de Funcionamento

1.  **No Discord**: Use o comando `/setup-acesso` em um canal de recepção.
2.  **No Discord**: Use o comando `/setup-relatorio` no canal de relatórios.
3.  Ao clicar em **Solicitar Acesso**, o bot pedirá Steam ID e Nome do Personagem.
4.  Ao finalizar, o bot tentará te dar o cargo automaticamente e enviará os dados para o site.
5.  Acesse o site e faça o login; você cairá direto no **Meu PDA** com seus dados vinculados.
