-- =============================================================================
-- Sub-investigador — PASO 2: funciones, triggers y RLS
-- =============================================================================
-- Ejecutar DESPUÉS de 0010_sub_investigator.sql (en otra query / tras commit).

create or replace function public.is_clinical_lead()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.get_user_app_role() in (
    'investigator'::public.app_role,
    'sub_investigator'::public.app_role
  );
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
    'sub_investigator'::public.app_role,
    'coordinator'::public.app_role
  );
$$;

grant execute on function public.is_clinical_lead() to authenticated;

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
     and not public.is_clinical_lead() then
    raise exception
      'Solo Investigador Principal o Sub-investigador pueden marcar Apto / Randomizado.';
  end if;

  return new;
end;
$$;

create or replace function public.assign_user_clinical_role(
  p_user_id uuid,
  p_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_role public.app_role;
begin
  if not public.can_manage_clinical_roles() then
    raise exception 'Solo el Investigador Principal puede asignar roles clínicos.';
  end if;

  v_caller_role := public.get_user_app_role();

  if p_user_id = auth.uid() and p_role <> v_caller_role then
    raise exception 'No puedes cambiar tu propio rol; otro investigador debe hacerlo.';
  end if;

  insert into public.user_roles (user_id, role, assigned_by)
  values (p_user_id, p_role, auth.uid())
  on conflict (user_id) do update
    set role = excluded.role,
        assigned_by = excluded.assigned_by,
        updated_at = now();
end;
$$;

drop policy if exists "clinical_delete_patients" on public.patients;
create policy "clinical_delete_patients"
  on public.patients for delete to authenticated
  using (public.is_clinical_lead());

drop policy if exists "clinical_delete_profiles" on public.clinical_profiles;
create policy "clinical_delete_profiles"
  on public.clinical_profiles for delete to authenticated
  using (public.is_clinical_lead());

drop policy if exists "clinical_insert_protocols" on public.protocols;
create policy "clinical_insert_protocols"
  on public.protocols for insert to authenticated
  with check (public.is_clinical_lead());

drop policy if exists "clinical_update_protocols" on public.protocols;
create policy "clinical_update_protocols"
  on public.protocols for update to authenticated
  using (public.is_clinical_lead())
  with check (public.is_clinical_lead());

drop policy if exists "clinical_delete_protocols" on public.protocols;
create policy "clinical_delete_protocols"
  on public.protocols for delete to authenticated
  using (public.is_clinical_lead());

drop policy if exists "clinical_delete_screenings" on public.screenings;
create policy "clinical_delete_screenings"
  on public.screenings for delete to authenticated
  using (public.is_clinical_lead());

comment on function public.is_clinical_lead() is
  'Investigator o sub_investigator — aprobaciones médicas y gestión de protocolos.';
