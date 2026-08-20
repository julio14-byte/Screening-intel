-- =============================================================================
-- Screening Intelligence — RBAC clínico (investigator / coordinator / monitor)
-- =============================================================================
-- Ejecutar después de 0006_audit_trail.sql
--
-- Roles:
--   investigator — control total, aprobaciones médicas, gestión de roles
--   coordinator  — registro de pacientes, screening operativo (sin randomización)
--   monitor      — solo lectura (CRA / auditoría farmacéutica)

-- -----------------------------------------------------------------------------
-- Enum de roles clínicos
-- -----------------------------------------------------------------------------
do $$
begin
  create type public.app_role as enum (
    'investigator',
    'coordinator',
    'monitor'
  );
exception
  when duplicate_object then null;
end $$;

-- -----------------------------------------------------------------------------
-- user_roles — rol clínico por usuario (1:1 con auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.user_roles (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  role        public.app_role not null default 'coordinator',
  assigned_by uuid references auth.users (id) on delete set null,
  assigned_at timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.user_roles is
  'Rol clínico RBAC del personal del research site (CFR / GCP).';

create index if not exists user_roles_role_idx on public.user_roles (role);

drop trigger if exists user_roles_set_updated_at on public.user_roles;
create trigger user_roles_set_updated_at
  before update on public.user_roles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Funciones de autorización (SECURITY DEFINER, search_path fijo)
-- -----------------------------------------------------------------------------
create or replace function public.get_user_app_role(p_user_id uuid default auth.uid())
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select ur.role
      from public.user_roles ur
      where ur.user_id = coalesce(p_user_id, auth.uid())
    ),
    'coordinator'::public.app_role
  );
$$;

create or replace function public.has_app_role(p_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.get_user_app_role() = any (p_roles);
$$;

create or replace function public.can_write_clinical_data()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.get_user_app_role() in (
    'investigator'::public.app_role,
    'coordinator'::public.app_role
  );
$$;

create or replace function public.can_manage_clinical_roles()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.get_user_app_role() = 'investigator'::public.app_role;
$$;

create or replace function public.is_clinical_read_only()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.get_user_app_role() = 'monitor'::public.app_role;
$$;

grant execute on function public.get_user_app_role(uuid) to authenticated;
grant execute on function public.has_app_role(public.app_role[]) to authenticated;
grant execute on function public.can_write_clinical_data() to authenticated;
grant execute on function public.can_manage_clinical_roles() to authenticated;
grant execute on function public.is_clinical_read_only() to authenticated;

-- -----------------------------------------------------------------------------
-- Asignación automática al unirse a una organización
-- owner → investigator, resto → coordinator
-- -----------------------------------------------------------------------------
create or replace function public.assign_default_clinical_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
begin
  v_role := case
    when new.role = 'owner' then 'investigator'::public.app_role
    else 'coordinator'::public.app_role
  end;

  insert into public.user_roles (user_id, role, assigned_by)
  values (new.user_id, v_role, null)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists organization_members_assign_clinical_role
  on public.organization_members;

create trigger organization_members_assign_clinical_role
  after insert on public.organization_members
  for each row execute function public.assign_default_clinical_role();

-- Backfill roles para usuarios existentes
insert into public.user_roles (user_id, role)
select
  om.user_id,
  case
    when om.role = 'owner' then 'investigator'::public.app_role
    else 'coordinator'::public.app_role
  end
from public.organization_members om
on conflict (user_id) do nothing;

-- -----------------------------------------------------------------------------
-- RBAC en screenings: solo investigator puede pasar a randomized (Apto)
-- -----------------------------------------------------------------------------
create or replace function public.enforce_screening_status_rbac()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
begin
  v_role := public.get_user_app_role();

  if v_role = 'monitor'::public.app_role then
    raise exception 'Monitor CRA: acceso de solo lectura. No se permiten modificaciones.';
  end if;

  if new.status = 'randomized'::public.screening_status
     and old.status is distinct from new.status
     and v_role <> 'investigator'::public.app_role then
    raise exception
      'Solo el Investigador Principal puede marcar el estatus Randomización (Apto).';
  end if;

  return new;
end;
$$;

drop trigger if exists screenings_rbac_status on public.screenings;
create trigger screenings_rbac_status
  before update on public.screenings
  for each row execute function public.enforce_screening_status_rbac();

-- -----------------------------------------------------------------------------
-- RPC: asignar rol clínico (solo investigator)
-- -----------------------------------------------------------------------------
create or replace function public.assign_user_clinical_role(
  p_user_id uuid,
  p_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_manage_clinical_roles() then
    raise exception 'Solo el Investigador Principal puede asignar roles clínicos.';
  end if;

  if p_user_id = auth.uid() and p_role <> 'investigator'::public.app_role then
    raise exception 'No podés degradarte a vos mismo; otro investigador debe hacerlo.';
  end if;

  insert into public.user_roles (user_id, role, assigned_by)
  values (p_user_id, p_role, auth.uid())
  on conflict (user_id) do update
    set role = excluded.role,
        assigned_by = excluded.assigned_by,
        updated_at = now();
end;
$$;

grant execute on function public.assign_user_clinical_role(uuid, public.app_role)
  to authenticated;

-- -----------------------------------------------------------------------------
-- RLS: user_roles
-- -----------------------------------------------------------------------------
alter table public.user_roles enable row level security;

drop policy if exists "user_roles_select" on public.user_roles;
create policy "user_roles_select"
  on public.user_roles
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.can_manage_clinical_roles()
  );

drop policy if exists "user_roles_insert_investigator" on public.user_roles;
create policy "user_roles_insert_investigator"
  on public.user_roles
  for insert
  to authenticated
  with check (public.can_manage_clinical_roles());

drop policy if exists "user_roles_update_investigator" on public.user_roles;
create policy "user_roles_update_investigator"
  on public.user_roles
  for update
  to authenticated
  using (public.can_manage_clinical_roles())
  with check (public.can_manage_clinical_roles());

drop policy if exists "user_roles_delete_investigator" on public.user_roles;
create policy "user_roles_delete_investigator"
  on public.user_roles
  for delete
  to authenticated
  using (public.can_manage_clinical_roles());

-- -----------------------------------------------------------------------------
-- RLS clínico — reemplaza políticas permisivas del MVP
-- -----------------------------------------------------------------------------
-- patients
drop policy if exists "mvp full access patients" on public.patients;
drop policy if exists "clinical_select_patients" on public.patients;
drop policy if exists "clinical_write_patients" on public.patients;
drop policy if exists "clinical_delete_patients" on public.patients;

create policy "clinical_select_patients"
  on public.patients for select to authenticated using (true);

create policy "clinical_insert_patients"
  on public.patients for insert to authenticated
  with check (public.can_write_clinical_data());

create policy "clinical_update_patients"
  on public.patients for update to authenticated
  using (public.can_write_clinical_data())
  with check (public.can_write_clinical_data());

create policy "clinical_delete_patients"
  on public.patients for delete to authenticated
  using (public.get_user_app_role() = 'investigator'::public.app_role);

-- clinical_profiles
drop policy if exists "mvp full access clinical_profiles" on public.clinical_profiles;
drop policy if exists "clinical_select_profiles" on public.clinical_profiles;
drop policy if exists "clinical_write_profiles" on public.clinical_profiles;
drop policy if exists "clinical_delete_profiles" on public.clinical_profiles;

create policy "clinical_select_profiles"
  on public.clinical_profiles for select to authenticated using (true);

create policy "clinical_insert_profiles"
  on public.clinical_profiles for insert to authenticated
  with check (public.can_write_clinical_data());

create policy "clinical_update_profiles"
  on public.clinical_profiles for update to authenticated
  using (public.can_write_clinical_data())
  with check (public.can_write_clinical_data());

create policy "clinical_delete_profiles"
  on public.clinical_profiles for delete to authenticated
  using (public.get_user_app_role() = 'investigator'::public.app_role);

-- protocols (solo investigator escribe)
drop policy if exists "mvp full access protocols" on public.protocols;
drop policy if exists "clinical_select_protocols" on public.protocols;
drop policy if exists "clinical_write_protocols" on public.protocols;

create policy "clinical_select_protocols"
  on public.protocols for select to authenticated using (true);

create policy "clinical_insert_protocols"
  on public.protocols for insert to authenticated
  with check (public.get_user_app_role() = 'investigator'::public.app_role);

create policy "clinical_update_protocols"
  on public.protocols for update to authenticated
  using (public.get_user_app_role() = 'investigator'::public.app_role)
  with check (public.get_user_app_role() = 'investigator'::public.app_role);

create policy "clinical_delete_protocols"
  on public.protocols for delete to authenticated
  using (public.get_user_app_role() = 'investigator'::public.app_role);

-- screenings
drop policy if exists "mvp full access screenings" on public.screenings;
drop policy if exists "clinical_select_screenings" on public.screenings;
drop policy if exists "clinical_write_screenings" on public.screenings;
drop policy if exists "clinical_delete_screenings" on public.screenings;

create policy "clinical_select_screenings"
  on public.screenings for select to authenticated using (true);

create policy "clinical_insert_screenings"
  on public.screenings for insert to authenticated
  with check (public.can_write_clinical_data());

create policy "clinical_update_screenings"
  on public.screenings for update to authenticated
  using (public.can_write_clinical_data())
  with check (public.can_write_clinical_data());

create policy "clinical_delete_screenings"
  on public.screenings for delete to authenticated
  using (public.get_user_app_role() = 'investigator'::public.app_role);

-- audit_logs: lectura para todos autenticados (ya definido en 0006)
-- Escritura sigue solo vía funciones SECURITY DEFINER

-- Revocar acceso anon a datos clínicos (producción con auth obligatorio)
drop policy if exists "mvp full access patients" on public.patients;
drop policy if exists "mvp full access clinical_profiles" on public.clinical_profiles;
drop policy if exists "mvp full access protocols" on public.protocols;
drop policy if exists "mvp full access screenings" on public.screenings;
