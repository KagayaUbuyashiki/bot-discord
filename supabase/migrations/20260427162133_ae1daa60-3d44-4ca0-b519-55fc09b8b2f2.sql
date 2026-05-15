ALTER TABLE public.pending_reports
ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS discord_user_id text,
ADD COLUMN IF NOT EXISTS discord_username text,
ADD COLUMN IF NOT EXISTS discord_channel_id text;

CREATE INDEX IF NOT EXISTS idx_pending_reports_status ON public.pending_reports(status);
CREATE INDEX IF NOT EXISTS idx_pending_reports_created ON public.pending_reports(created_at DESC);