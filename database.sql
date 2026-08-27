-- ============================================================
-- EJECUTA ESTE SCRIPT EN TU SUPABASE SQL EDITOR
-- Si ya ejecutaste antes, usa DROP POLICY primero
-- ============================================================

-- ============================================================
-- PRIMER USUARIO (SUPERVISOR)
-- Cambia 'admin123' por la contrasena que quieras
-- ============================================================
INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@sis-app.local',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Administrador","username":"admin","role":"supervisor"}'
);
-- Usuario: admin | Contrasena: admin123

-- Eliminar politicas existentes si las hay
DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Supervisors can read assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Supervisors can create tasks" ON tasks;
DROP POLICY IF EXISTS "Supervisors can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update assigned task status" ON tasks;

-- 1. Tabla de perfiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('supervisor', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de tareas
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'validated')),
  assigned_to UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ
);

-- 3. Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 4. Politicas profiles
CREATE POLICY "Anyone can read profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Authenticated users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 5. Politicas tasks
CREATE POLICY "Supervisors can read assigned tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = assigned_by OR auth.uid() = assigned_to);

CREATE POLICY "Supervisors can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'supervisor')
  );

CREATE POLICY "Supervisors can update own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = assigned_by);

CREATE POLICY "Users can update assigned task status"
  ON tasks FOR UPDATE
  USING (auth.uid() = assigned_to AND status IN ('pending', 'in_progress'));

-- 6. Trigger para crear perfil automatico
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
