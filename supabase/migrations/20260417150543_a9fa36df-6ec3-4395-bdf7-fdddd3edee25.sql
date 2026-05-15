
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'high', 'medio', 'iniciado');
CREATE TYPE public.profile_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.mission_status AS ENUM ('active', 'completed', 'archived');
CREATE TYPE public.mission_difficulty AS ENUM ('low', 'medium', 'high', 'extreme');
CREATE TYPE public.report_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.report_classification AS ENUM ('success', 'partial', 'failure');

-- ============ UTIL: updated_at trigger function ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  steam_id TEXT,
  status public.profile_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ USER_ROLES (separated for security) ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- has_min_role: admin > high > medio > iniciado
CREATE OR REPLACE FUNCTION public.has_min_role(_user_id UUID, _min public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND CASE role
        WHEN 'admin' THEN 4
        WHEN 'high' THEN 3
        WHEN 'medio' THEN 2
        WHEN 'iniciado' THEN 1
      END >= CASE _min
        WHEN 'admin' THEN 4
        WHEN 'high' THEN 3
        WHEN 'medio' THEN 2
        WHEN 'iniciado' THEN 1
      END
  )
$$;

-- is_approved: helper
CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND status = 'approved'
  )
$$;

-- ============ PROFILES policies ============
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Approved members can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_approved(auth.uid()));
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- ============ USER_ROLES policies ============
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Approved members can view all roles" ON public.user_roles
  FOR SELECT USING (public.is_approved(auth.uid()));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ Auto-create profile on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, steam_id, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'steam_id',
    'pending'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ STALKERS ============
CREATE TABLE public.stalkers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  steam_id TEXT NOT NULL UNIQUE,
  photo_url TEXT,
  reputation INTEGER NOT NULL DEFAULT 0 CHECK (reputation >= 0 AND reputation <= 4000),
  badge_tier INTEGER NOT NULL DEFAULT 1 CHECK (badge_tier BETWEEN 1 AND 4),
  missions_completed INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.stalkers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_stalkers_reputation ON public.stalkers (reputation DESC);
CREATE INDEX idx_stalkers_missions ON public.stalkers (missions_completed DESC);
CREATE TRIGGER stalkers_updated_at BEFORE UPDATE ON public.stalkers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-update badge_tier from reputation
CREATE OR REPLACE FUNCTION public.compute_badge_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.badge_tier := LEAST(4, GREATEST(1, (NEW.reputation / 1000) + 1));
  IF NEW.reputation >= 4000 THEN NEW.badge_tier := 4; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER stalkers_badge_tier BEFORE INSERT OR UPDATE OF reputation ON public.stalkers
  FOR EACH ROW EXECUTE FUNCTION public.compute_badge_tier();

CREATE POLICY "Approved members view stalkers" ON public.stalkers
  FOR SELECT USING (public.is_approved(auth.uid()));
CREATE POLICY "Medio+ insert stalkers" ON public.stalkers
  FOR INSERT WITH CHECK (public.has_min_role(auth.uid(), 'medio'));
CREATE POLICY "Medio+ update stalkers" ON public.stalkers
  FOR UPDATE USING (public.has_min_role(auth.uid(), 'medio'));
CREATE POLICY "High+ delete stalkers" ON public.stalkers
  FOR DELETE USING (public.has_min_role(auth.uid(), 'high'));

-- ============ MISSIONS ============
CREATE TABLE public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  reward_money INTEGER NOT NULL DEFAULT 0,
  reward_reputation INTEGER NOT NULL DEFAULT 0,
  difficulty public.mission_difficulty NOT NULL DEFAULT 'medium',
  status public.mission_status NOT NULL DEFAULT 'active',
  assigned_stalker_id UUID REFERENCES public.stalkers(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER missions_updated_at BEFORE UPDATE ON public.missions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Approved members view missions" ON public.missions
  FOR SELECT USING (public.is_approved(auth.uid()));
CREATE POLICY "Medio+ insert missions" ON public.missions
  FOR INSERT WITH CHECK (public.has_min_role(auth.uid(), 'medio'));
CREATE POLICY "Medio+ update missions" ON public.missions
  FOR UPDATE USING (public.has_min_role(auth.uid(), 'medio'));
CREATE POLICY "High+ delete missions" ON public.missions
  FOR DELETE USING (public.has_min_role(auth.uid(), 'high'));

-- ============ MISSION REPORTS (approved) ============
CREATE TABLE public.mission_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stalker_id UUID NOT NULL REFERENCES public.stalkers(id) ON DELETE CASCADE,
  mission_id UUID REFERENCES public.missions(id) ON DELETE SET NULL,
  summary TEXT NOT NULL,
  raw_text TEXT,
  classification public.report_classification NOT NULL DEFAULT 'success',
  reputation_awarded INTEGER NOT NULL DEFAULT 0,
  money_awarded INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mission_reports ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_mission_reports_stalker ON public.mission_reports (stalker_id, created_at DESC);

CREATE POLICY "Approved members view reports" ON public.mission_reports
  FOR SELECT USING (public.is_approved(auth.uid()));
CREATE POLICY "Medio+ insert reports" ON public.mission_reports
  FOR INSERT WITH CHECK (public.has_min_role(auth.uid(), 'medio'));
CREATE POLICY "High+ delete reports" ON public.mission_reports
  FOR DELETE USING (public.has_min_role(auth.uid(), 'high'));

-- ============ PENDING REPORTS (Discord queue) ============
CREATE TABLE public.pending_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'discord',
  stalker_steam_id TEXT,
  stalker_id UUID REFERENCES public.stalkers(id) ON DELETE SET NULL,
  mission_id UUID REFERENCES public.missions(id) ON DELETE SET NULL,
  raw_text TEXT NOT NULL,
  ai_analysis JSONB,
  status public.report_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pending_reports ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER pending_reports_updated_at BEFORE UPDATE ON public.pending_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Approved members view pending" ON public.pending_reports
  FOR SELECT USING (public.is_approved(auth.uid()));
CREATE POLICY "Medio+ update pending" ON public.pending_reports
  FOR UPDATE USING (public.has_min_role(auth.uid(), 'medio'));
CREATE POLICY "Medio+ delete pending" ON public.pending_reports
  FOR DELETE USING (public.has_min_role(auth.uid(), 'medio'));
-- INSERT happens via service role from webhook; no client insert policy

-- ============ MUTANT PRICES ============
CREATE TABLE public.mutant_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mutant_prices ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER mutant_prices_updated_at BEFORE UPDATE ON public.mutant_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Approved members view mutant prices" ON public.mutant_prices
  FOR SELECT USING (public.is_approved(auth.uid()));
CREATE POLICY "Medio+ insert mutant prices" ON public.mutant_prices
  FOR INSERT WITH CHECK (public.has_min_role(auth.uid(), 'medio'));
CREATE POLICY "Medio+ update mutant prices" ON public.mutant_prices
  FOR UPDATE USING (public.has_min_role(auth.uid(), 'medio'));
CREATE POLICY "High+ delete mutant prices" ON public.mutant_prices
  FOR DELETE USING (public.has_min_role(auth.uid(), 'high'));

-- ============ EQUIPMENT ============
CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER equipment_updated_at BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Approved members view equipment" ON public.equipment
  FOR SELECT USING (public.is_approved(auth.uid()));
CREATE POLICY "Medio+ insert equipment" ON public.equipment
  FOR INSERT WITH CHECK (public.has_min_role(auth.uid(), 'medio'));
CREATE POLICY "Medio+ update equipment" ON public.equipment
  FOR UPDATE USING (public.has_min_role(auth.uid(), 'medio'));
CREATE POLICY "High+ delete equipment" ON public.equipment
  FOR DELETE USING (public.has_min_role(auth.uid(), 'high'));

-- ============ LORE (single row) ============
CREATE TABLE public.lore (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lore ENABLE ROW LEVEL SECURITY;
INSERT INTO public.lore (content) VALUES ('A facção Free Stalkers nasceu nas profundezas da Zona...');

CREATE POLICY "Approved members view lore" ON public.lore
  FOR SELECT USING (public.is_approved(auth.uid()));
CREATE POLICY "High+ update lore" ON public.lore
  FOR UPDATE USING (public.has_min_role(auth.uid(), 'high'));

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('stalker-photos', 'stalker-photos', true),
  ('mutant-images', 'mutant-images', true),
  ('equipment-images', 'equipment-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for all 3 buckets
CREATE POLICY "Public read stalker-photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'stalker-photos');
CREATE POLICY "Public read mutant-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'mutant-images');
CREATE POLICY "Public read equipment-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'equipment-images');

-- Medio+ can upload/update/delete in stalker-photos and mutant-images and equipment-images
CREATE POLICY "Medio+ upload stalker-photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'stalker-photos' AND public.has_min_role(auth.uid(), 'medio'));
CREATE POLICY "Medio+ update stalker-photos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'stalker-photos' AND public.has_min_role(auth.uid(), 'medio'));
CREATE POLICY "High+ delete stalker-photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'stalker-photos' AND public.has_min_role(auth.uid(), 'high'));

CREATE POLICY "Medio+ upload mutant-images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'mutant-images' AND public.has_min_role(auth.uid(), 'medio'));
CREATE POLICY "Medio+ update mutant-images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'mutant-images' AND public.has_min_role(auth.uid(), 'medio'));
CREATE POLICY "High+ delete mutant-images" ON storage.objects
  FOR DELETE USING (bucket_id = 'mutant-images' AND public.has_min_role(auth.uid(), 'high'));

CREATE POLICY "Medio+ upload equipment-images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'equipment-images' AND public.has_min_role(auth.uid(), 'medio'));
CREATE POLICY "Medio+ update equipment-images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'equipment-images' AND public.has_min_role(auth.uid(), 'medio'));
CREATE POLICY "High+ delete equipment-images" ON storage.objects
  FOR DELETE USING (bucket_id = 'equipment-images' AND public.has_min_role(auth.uid(), 'high'));
