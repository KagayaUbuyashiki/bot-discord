-- =====================================================================
-- MIGRAÇÃO COMPLETA: schema do PDA para o projeto xxrjiqxjktfedngiqksw
-- Rode este arquivo INTEIRO no SQL Editor do dashboard do Supabase do xxr.
-- Cole tudo de uma vez e clique em Run.
-- =====================================================================

-- ---------- ENUMS ----------
CREATE TYPE public.app_role AS ENUM ('admin','high','medio','iniciado');
CREATE TYPE public.profile_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.mission_difficulty AS ENUM ('low','medium','high','extreme');
CREATE TYPE public.mission_status AS ENUM ('active','completed','archived');
CREATE TYPE public.report_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.report_classification AS ENUM ('success','partial','failure');

-- ---------- FUNÇÕES UTILITÁRIAS ----------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.compute_badge_tier()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.badge_tier := LEAST(4, GREATEST(1, (NEW.reputation / 1000) + 1));
  IF NEW.reputation >= 4000 THEN NEW.badge_tier := 4; END IF;
  RETURN NEW;
END; $$;

-- ---------- TABELA: profiles ----------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  username text NOT NULL,
  status public.profile_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- TABELA: user_roles ----------
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ---------- FUNÇÕES DE AUTORIZAÇÃO (precisam vir depois das tabelas) ----------
CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND status = 'approved')
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_min_role(_user_id uuid, _min public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND CASE role
        WHEN 'admin' THEN 4 WHEN 'high' THEN 3 WHEN 'medio' THEN 2 WHEN 'iniciado' THEN 1 END
        >= CASE _min
        WHEN 'admin' THEN 4 WHEN 'high' THEN 3 WHEN 'medio' THEN 2 WHEN 'iniciado' THEN 1 END
  )
$$;

-- ---------- TRIGGER: criar profile automaticamente quando user assina ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, status)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
          'pending')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------- POLICIES: profiles ----------
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Approved members can view all profiles" ON public.profiles FOR SELECT USING (public.is_approved(auth.uid()));
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ---------- POLICIES: user_roles ----------
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Approved members can view all roles" ON public.user_roles FOR SELECT USING (public.is_approved(auth.uid()));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ---------- TABELA: stalkers ----------
CREATE TABLE public.stalkers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  steam_id text NOT NULL,
  photo_url text,
  badge_tier integer NOT NULL DEFAULT 1,
  missions_completed integer NOT NULL DEFAULT 0,
  notes text,
  reputation integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stalkers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER stalkers_updated_at BEFORE UPDATE ON public.stalkers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER stalkers_badge_tier BEFORE INSERT OR UPDATE ON public.stalkers FOR EACH ROW EXECUTE FUNCTION public.compute_badge_tier();
CREATE POLICY "Approved members view stalkers" ON public.stalkers FOR SELECT USING (public.is_approved(auth.uid()));
CREATE POLICY "Medio+ insert stalkers" ON public.stalkers FOR INSERT WITH CHECK (public.has_min_role(auth.uid(),'medio'));
CREATE POLICY "Medio+ update stalkers" ON public.stalkers FOR UPDATE USING (public.has_min_role(auth.uid(),'medio'));
CREATE POLICY "High+ delete stalkers" ON public.stalkers FOR DELETE USING (public.has_min_role(auth.uid(),'high'));

-- ---------- TABELA: missions ----------
CREATE TABLE public.missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  difficulty public.mission_difficulty NOT NULL DEFAULT 'medium',
  status public.mission_status NOT NULL DEFAULT 'active',
  reward_money integer NOT NULL DEFAULT 0,
  reward_reputation integer NOT NULL DEFAULT 0,
  assigned_stalker_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER missions_updated_at BEFORE UPDATE ON public.missions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Approved members view missions" ON public.missions FOR SELECT USING (public.is_approved(auth.uid()));
CREATE POLICY "Medio+ insert missions" ON public.missions FOR INSERT WITH CHECK (public.has_min_role(auth.uid(),'medio'));
CREATE POLICY "Medio+ update missions" ON public.missions FOR UPDATE USING (public.has_min_role(auth.uid(),'medio'));
CREATE POLICY "High+ delete missions" ON public.missions FOR DELETE USING (public.has_min_role(auth.uid(),'high'));

-- ---------- TABELA: mission_reports ----------
CREATE TABLE public.mission_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stalker_id uuid NOT NULL,
  mission_id uuid,
  summary text NOT NULL,
  raw_text text,
  classification public.report_classification NOT NULL DEFAULT 'success',
  reputation_awarded integer NOT NULL DEFAULT 0,
  money_awarded integer NOT NULL DEFAULT 0,
  tags text[] DEFAULT '{}',
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mission_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved members view reports" ON public.mission_reports FOR SELECT USING (public.is_approved(auth.uid()));
CREATE POLICY "Medio+ insert reports" ON public.mission_reports FOR INSERT WITH CHECK (public.has_min_role(auth.uid(),'medio'));
CREATE POLICY "High+ delete reports" ON public.mission_reports FOR DELETE USING (public.has_min_role(auth.uid(),'high'));

-- ---------- TABELA: pending_reports ----------
CREATE TABLE public.pending_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'discord',
  raw_text text NOT NULL,
  stalker_steam_id text,
  stalker_id uuid,
  mission_id uuid,
  ai_analysis jsonb,
  status public.report_status NOT NULL DEFAULT 'pending',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  discord_user_id text,
  discord_username text,
  discord_channel_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pending_reports ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER pending_reports_updated_at BEFORE UPDATE ON public.pending_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Approved members view pending" ON public.pending_reports FOR SELECT USING (public.is_approved(auth.uid()));
CREATE POLICY "Medio+ update pending" ON public.pending_reports FOR UPDATE USING (public.has_min_role(auth.uid(),'medio'));
CREATE POLICY "Medio+ delete pending" ON public.pending_reports FOR DELETE USING (public.has_min_role(auth.uid(),'medio'));

-- ---------- TABELA: equipment ----------
CREATE TABLE public.equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price integer NOT NULL DEFAULT 0,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER equipment_updated_at BEFORE UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Approved members view equipment" ON public.equipment FOR SELECT USING (public.is_approved(auth.uid()));
CREATE POLICY "Medio+ insert equipment" ON public.equipment FOR INSERT WITH CHECK (public.has_min_role(auth.uid(),'medio'));
CREATE POLICY "Medio+ update equipment" ON public.equipment FOR UPDATE USING (public.has_min_role(auth.uid(),'medio'));
CREATE POLICY "High+ delete equipment" ON public.equipment FOR DELETE USING (public.has_min_role(auth.uid(),'high'));

-- ---------- TABELA: mutant_prices ----------
CREATE TABLE public.mutant_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price integer NOT NULL DEFAULT 0,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.mutant_prices ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER mutant_prices_updated_at BEFORE UPDATE ON public.mutant_prices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Approved members view mutant prices" ON public.mutant_prices FOR SELECT USING (public.is_approved(auth.uid()));
CREATE POLICY "Medio+ insert mutant prices" ON public.mutant_prices FOR INSERT WITH CHECK (public.has_min_role(auth.uid(),'medio'));
CREATE POLICY "Medio+ update mutant prices" ON public.mutant_prices FOR UPDATE USING (public.has_min_role(auth.uid(),'medio'));
CREATE POLICY "High+ delete mutant prices" ON public.mutant_prices FOR DELETE USING (public.has_min_role(auth.uid(),'high'));

-- ---------- TABELA: lore ----------
CREATE TABLE public.lore (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL DEFAULT '',
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lore ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved members view lore" ON public.lore FOR SELECT USING (public.is_approved(auth.uid()));
CREATE POLICY "High+ update lore" ON public.lore FOR UPDATE USING (public.has_min_role(auth.uid(),'high'));

-- ---------- STORAGE BUCKETS ----------
INSERT INTO storage.buckets (id, name, public) VALUES
  ('stalker-photos','stalker-photos', true),
  ('mutant-images','mutant-images', true),
  ('equipment-images','equipment-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies de storage (leitura pública, upload pra usuários autenticados aprovados)
CREATE POLICY "Public read stalker-photos" ON storage.objects FOR SELECT USING (bucket_id='stalker-photos');
CREATE POLICY "Approved upload stalker-photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id='stalker-photos' AND public.is_approved(auth.uid()));
CREATE POLICY "Approved update stalker-photos" ON storage.objects FOR UPDATE USING (bucket_id='stalker-photos' AND public.is_approved(auth.uid()));
CREATE POLICY "Approved delete stalker-photos" ON storage.objects FOR DELETE USING (bucket_id='stalker-photos' AND public.is_approved(auth.uid()));

CREATE POLICY "Public read mutant-images" ON storage.objects FOR SELECT USING (bucket_id='mutant-images');
CREATE POLICY "Approved upload mutant-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id='mutant-images' AND public.is_approved(auth.uid()));
CREATE POLICY "Approved update mutant-images" ON storage.objects FOR UPDATE USING (bucket_id='mutant-images' AND public.is_approved(auth.uid()));
CREATE POLICY "Approved delete mutant-images" ON storage.objects FOR DELETE USING (bucket_id='mutant-images' AND public.is_approved(auth.uid()));

CREATE POLICY "Public read equipment-images" ON storage.objects FOR SELECT USING (bucket_id='equipment-images');
CREATE POLICY "Approved upload equipment-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id='equipment-images' AND public.is_approved(auth.uid()));
CREATE POLICY "Approved update equipment-images" ON storage.objects FOR UPDATE USING (bucket_id='equipment-images' AND public.is_approved(auth.uid()));
CREATE POLICY "Approved delete equipment-images" ON storage.objects FOR DELETE USING (bucket_id='equipment-images' AND public.is_approved(auth.uid()));

-- =====================================================================
-- FIM. Schema replicado. Próximos passos no MIGRACAO-XXR.md.
-- =====================================================================
