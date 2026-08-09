-- ========================================================================
-- CRONOS SALUD - PASTILLERO DIGITAL
-- Esquema de Base de Datos y Políticas de Seguridad (Supabase PostgreSQL)
-- ========================================================================

-- 1. EXTENSIONES
create extension if not exists "uuid-ossp";

-- 2. TABLA: pastillero_users (Perfiles de pacientes y auditores familiares)
create table if not exists public.pastillero_users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  patient_name text not null,
  auditor_name text not null,
  auditor_phone text not null,
  auditor2_name text,
  auditor2_phone text,
  notes text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. TABLA: pastillero_schedules (Dosis y horarios configurados por paciente)
create table if not exists public.pastillero_schedules (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.pastillero_users(id) on delete cascade not null,
  dose_name text not null,
  scheduled_time text not null, -- formato "HH:MM", ej: "08:00"
  grace_minutes integer default 30 not null,
  active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. TABLA: pastillero_logs (Registro histórico de tomas y emergencias)
create table if not exists public.pastillero_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.pastillero_users(id) on delete cascade not null,
  schedule_id uuid references public.pastillero_schedules(id) on delete set null,
  action text not null, -- 'dose_taken', 'missed_dose', 'emergency'
  notify_sent boolean default false not null,
  success boolean default true not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. TABLA: pastillero_subs (Control de suscripciones y pagos Hotmart / Google Play / MP)
create table if not exists public.pastillero_subs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.pastillero_users(id) on delete cascade not null,
  email text not null,
  provider text not null default 'hotmart', -- 'hotmart', 'google_play', 'mercadopago', 'stripe', 'manual_bypass'
  subscription_id text,
  status text not null default 'active', -- 'active', 'canceled', 'refunded', 'trialing'
  active boolean default true not null,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. ÍNDICES DE RENDIMIENTO
create index if not exists idx_schedules_user on public.pastillero_schedules(user_id);
create index if not exists idx_logs_user_time on public.pastillero_logs(user_id, timestamp desc);
create index if not exists idx_subs_user_active on public.pastillero_subs(user_id, active);
create index if not exists idx_subs_email on public.pastillero_subs(email);

-- 7. SEGURIDAD A NIVEL DE FILAS (ROW LEVEL SECURITY - RLS)
alter table public.pastillero_users enable row level security;
alter table public.pastillero_schedules enable row level security;
alter table public.pastillero_logs enable row level security;
alter table public.pastillero_subs enable row level security;

-- Políticas para pastillero_users
create policy "Usuarios gestionan su propio perfil"
  on public.pastillero_users for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Políticas para pastillero_schedules
create policy "Usuarios gestionan sus propios horarios de dosis"
  on public.pastillero_schedules for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Políticas para pastillero_logs
create policy "Usuarios leen y registran sus propios logs"
  on public.pastillero_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Políticas para pastillero_subs (Lectura de su propia suscripción)
create policy "Usuarios pueden consultar su estado de suscripcion"
  on public.pastillero_subs for select
  using (auth.uid() = user_id or email = (select email from auth.users where id = auth.uid()));

-- Service role / Edge functions pueden insertar/actualizar suscripciones
-- (Las Edge Functions usan SERVICE_ROLE_KEY para webhooks de Hotmart/Google Play)
