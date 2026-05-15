ALTER TABLE public.stalkers ADD COLUMN IF NOT EXISTS discord_user_id text;
CREATE UNIQUE INDEX IF NOT EXISTS stalkers_discord_user_id_unique
  ON public.stalkers(discord_user_id) WHERE discord_user_id IS NOT NULL;