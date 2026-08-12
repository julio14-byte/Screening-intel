-- =============================================================================
-- Screening Intelligence para Research Sites — Esquema inicial
-- =============================================================================
-- Ejecutar en el SQL Editor de Supabase o con `supabase db push`.

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.screening_status as enum (
  'pre_screening',
  'screening',
  'randomized',
  'screen_failure'
);

create type public.protocol_status as enum ('active', 'closed');

create type public.gender_type as enum ('male', 'female', 'other');

-- -----------------------------------------------------------------------------
-- patients — Registro de pacientes de la clínica
-- -----------------------------------------------------------------------------
create table public.patients (
  id          uuid primary key default gen_random_uuid(),
  -- MVP de una sola clínica: se usa un UUID fijo por defecto. Al agregar
  -- multi-tenancy real, este valor vendrá del JWT del usuario autenticado.
  clinic_id   uuid not null default '00000000-0000-0000-0000-000000000001',
  first_name  text not null,
  last_name   text not null,
  birth_date  date not null,
  gender      public.gender_type not null,
  created_at  timestamptz not null default now()
);

create index patients_clinic_id_idx on public.patients (clinic_id);
create index patients_last_name_idx on public.patients (last_name);

-- -----------------------------------------------------------------------------
-- clinical_profiles — Perfil clínico (condiciones, medicación, laboratorios)
-- -----------------------------------------------------------------------------
create table public.clinical_profiles (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients (id) on delete cascade,
  -- Lista de patologías / diagnósticos, ej: ['diabetes tipo 2', 'hipertensión']
  conditions   text[] not null default '{}',
  -- Medicación concomitante actual, ej: ['metformina', 'enalapril']
  medications  text[] not null default '{}',
  -- Últimos valores de laboratorio, ej: {"glucosa": 110, "creatinina": 1.2}
  laboratories jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now(),
  constraint clinical_profiles_patient_unique unique (patient_id)
);

create index clinical_profiles_patient_id_idx on public.clinical_profiles (patient_id);

-- -----------------------------------------------------------------------------
-- protocols — Protocolos de estudio con criterios estructurados
-- -----------------------------------------------------------------------------
-- inclusion_criteria (jsonb):
-- {
--   "min_age": 18,
--   "max_age": 75,
--   "gender": "any" | "male" | "female",
--   "required_conditions": ["diabetes tipo 2"],
--   "required_labs": [{ "name": "glucosa", "min": 100, "max": 180, "unit": "mg/dL" }]
-- }
-- exclusion_criteria (jsonb):
-- {
--   "excluded_conditions": ["insuficiencia renal"],
--   "excluded_medications": ["insulina"]
-- }
create table public.protocols (
  id                 uuid primary key default gen_random_uuid(),
  clinic_id          uuid not null default '00000000-0000-0000-0000-000000000001',
  title              text not null,
  code_name          text not null,
  inclusion_criteria jsonb not null default '{}'::jsonb,
  exclusion_criteria jsonb not null default '{}'::jsonb,
  status             public.protocol_status not null default 'active',
  created_at         timestamptz not null default now()
);

create index protocols_status_idx on public.protocols (status);

-- -----------------------------------------------------------------------------
-- screenings — Trazabilidad del pipeline de screening por paciente/protocolo
-- -----------------------------------------------------------------------------
create table public.screenings (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.patients (id) on delete cascade,
  protocol_id   uuid not null references public.protocols (id) on delete cascade,
  status        public.screening_status not null default 'pre_screening',
  -- Porcentaje de coincidencia calculado por el motor de reglas (0-100)
  match_score   numeric(5, 2) not null default 0,
  -- Detalle criterio por criterio: por qué hizo match, qué falta o qué falló
  match_details jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint screenings_patient_protocol_unique unique (patient_id, protocol_id)
);

create index screenings_protocol_id_idx on public.screenings (protocol_id);
create index screenings_patient_id_idx on public.screenings (patient_id);
create index screenings_status_idx on public.screenings (status);

-- -----------------------------------------------------------------------------
-- Trigger: mantener updated_at al día
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clinical_profiles_set_updated_at
  before update on public.clinical_profiles
  for each row execute function public.set_updated_at();

create trigger screenings_set_updated_at
  before update on public.screenings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
-- RLS habilitado en todas las tablas. Para el MVP (sin autenticación) se crean
-- políticas permisivas para el rol anon/authenticated. Al incorporar Supabase
-- Auth, reemplazar por políticas basadas en clinic_id contra el JWT, p. ej.:
--   using (clinic_id = (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid)
-- Importante: usar app_metadata (no user_metadata) para autorización.

alter table public.patients enable row level security;
alter table public.clinical_profiles enable row level security;
alter table public.protocols enable row level security;
alter table public.screenings enable row level security;

create policy "mvp full access patients"
  on public.patients for all
  to anon, authenticated
  using (true) with check (true);

create policy "mvp full access clinical_profiles"
  on public.clinical_profiles for all
  to anon, authenticated
  using (true) with check (true);

create policy "mvp full access protocols"
  on public.protocols for all
  to anon, authenticated
  using (true) with check (true);

create policy "mvp full access screenings"
  on public.screenings for all
  to anon, authenticated
  using (true) with check (true);
