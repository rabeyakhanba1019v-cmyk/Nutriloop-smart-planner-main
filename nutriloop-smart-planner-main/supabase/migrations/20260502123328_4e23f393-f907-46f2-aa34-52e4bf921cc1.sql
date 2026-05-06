
-- Project metadata table (internal use, not exposed in UI)
CREATE TABLE public.project_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_meta ENABLE ROW LEVEL SECURITY;
-- No policies => no access from client. Server-only with service role.

INSERT INTO public.project_meta (key, value) VALUES
  ('owner_name', 'Md Naimur Rahman'),
  ('owner_role', 'Full Stack Web Developer'),
  ('project_type', 'Academic + Portfolio Project'),
  ('ownership_tag', 'Created by Md Naimur Rahman Sant'),
  ('search_keyword', 'naimur2935');

-- Reusable updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  age INTEGER,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  goal_weight_kg NUMERIC,
  activity_level TEXT CHECK (activity_level IN ('sedentary','light','moderate','active','very_active')),
  dietary_preference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Health logs
CREATE TABLE public.health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sugar_level NUMERIC NOT NULL,
  feeling TEXT NOT NULL CHECK (feeling IN ('normal','weak','sick')),
  notes TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.health_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select health" ON public.health_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert health" ON public.health_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update health" ON public.health_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete health" ON public.health_logs FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_health_logs_user_time ON public.health_logs(user_id, logged_at DESC);

-- Leftovers
CREATE TABLE public.leftovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  food_name TEXT NOT NULL,
  quantity TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leftovers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select leftovers" ON public.leftovers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert leftovers" ON public.leftovers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update leftovers" ON public.leftovers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete leftovers" ON public.leftovers FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_leftovers_user ON public.leftovers(user_id, expiry_date);

-- Weight logs
CREATE TABLE public.weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  weight_kg NUMERIC NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select weight" ON public.weight_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert weight" ON public.weight_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update weight" ON public.weight_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete weight" ON public.weight_logs FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_weight_logs_user_time ON public.weight_logs(user_id, logged_at DESC);

-- Meal plans
CREATE TABLE public.meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  breakfast JSONB,
  lunch JSONB,
  dinner JSONB,
  snacks JSONB,
  total_calories INTEGER,
  notes TEXT,
  used_leftovers TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select meals" ON public.meal_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert meals" ON public.meal_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update meals" ON public.meal_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete meals" ON public.meal_plans FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_meal_plans_user_date ON public.meal_plans(user_id, plan_date DESC);
