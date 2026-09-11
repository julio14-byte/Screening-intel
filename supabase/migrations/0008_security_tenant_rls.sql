-- =============================================================================
-- Screening Intelligence — Aislamiento multi-tenant + RLS estricto (HealthTech)
-- =============================================================================
-- Ejecutar después de 0007_rbac.sql
-- Funciones de tenant (SECURITY DEFINER, search_path fijo)
-- -----------------------------------------------------------------------------
create or replace function public.get_user_organization_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select om.organization_id
  from public.organization_members om
  where om.user_id = auth.uid();
$$;

create or replace function public.user_belongs_to_clinic(p_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.organization_id = p_clinic_id
  );
$$;

create or replace function public.get_user_primary_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select om.organization_id
  from public.organization_members om
  where om.user_id = auth.uid()
  order by
    case om.role
      when 'owner' then 0
      when 'admin' then 1
      else 2
    end,
    om.created_at
  limit 1;
$$;

grant execute on function public.get_user_organization_ids() to authenticated;
grant execute on function public.user_belongs_to_clinic(uuid) to authenticated;
grant execute on function public.get_user_primary_organization_id() to authenticated;

-- -----------------------------------------------------------------------------
-- Backfill: asignar datos MVP huérfanos a la org más antigua (single-site)
-- -----------------------------------------------------------------------------
update public.patients p
set clinic_id = sub.org_id
from (
  select id as org_id
  from public.organizations
  order by created_at
  limit 1
) sub
where p.clinic_id = '00000000-0000-0000-0000-000000000001'::uuid
  and sub.org_id is not null;

update public.protocols pr
set clinic_id = sub.org_id
from (
  select id as org_id
  from public.organizations
  order by created_at
  limit 1
) sub
where pr.clinic_id = '00000000-0000-0000-0000-000000000001'::uuid
  and sub.org_id is not null;

-- -----------------------------------------------------------------------------
-- Trigger: clinic_id coherente con la organización del usuario
-- -----------------------------------------------------------------------------
create or replace function public.set_clinic_id_from_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Autenticación requerida para datos clínicos.';
  end if;

  if new.clinic_id = '00000000-0000-0000-0000-000000000001'::uuid then
    v_org_id := public.get_user_primary_organization_id();
    if v_org_id is null then
      raise exception 'Usuario sin organización asignada.';
    end if;
    new.clinic_id := v_org_id;
  elsif not public.user_belongs_to_clinic(new.clinic_id) then
    raise exception 'Acceso denegado: clinic_id no pertenece a tu organización.';
  end if;

  return new;
end;
$$;

drop trigger if exists patients_set_clinic_id on public.patients;
create trigger patients_set_clinic_id
  before insert on public.patients
  for each row execute function public.set_clinic_id_from_organization();

drop trigger if exists protocols_set_clinic_id on public.protocols;
create trigger protocols_set_clinic_id
  before insert on public.protocols
  for each row execute function public.set_clinic_id_from_organization();

-- -----------------------------------------------------------------------------
-- Revocar acceso anon a datos clínicos
-- -----------------------------------------------------------------------------
revoke all on table public.patients from anon;
revoke all on table public.clinical_profiles from anon;
revoke all on table public.protocols from anon;
revoke all on table public.screenings from anon;
revoke all on table public.audit_logs from anon;

-- -----------------------------------------------------------------------------
-- RLS tenant-scoped — reemplaza políticas globales de 0007
-- -----------------------------------------------------------------------------

-- patients
drop policy if exists "clinical_select_patients" on public.patients;
drop policy if exists "clinical_insert_patients" on public.patients;
drop policy if exists "clinical_update_patients" on public.patients;
drop policy if exists "clinical_delete_patients" on public.patients;

create policy "tenant_select_patients"
  on public.patients for select to authenticated
  using (public.user_belongs_to_clinic(clinic_id));

create policy "tenant_insert_patients"
  on public.patients for insert to authenticated
  with check (
    public.can_write_clinical_data()
    and public.user_belongs_to_clinic(clinic_id)
  );

create policy "tenant_update_patients"
  on public.patients for update to authenticated
  using (
    public.can_write_clinical_data()
    and public.user_belongs_to_clinic(clinic_id)
  )
  with check (
    public.can_write_clinical_data()
    and public.user_belongs_to_clinic(clinic_id)
  );

create policy "tenant_delete_patients"
  on public.patients for delete to authenticated
  using (
    public.get_user_app_role() = 'investigator'::public.app_role
    and public.user_belongs_to_clinic(clinic_id)
  );

-- clinical_profiles (via patients.clinic_id)
drop policy if exists "clinical_select_profiles" on public.clinical_profiles;
drop policy if exists "clinical_insert_profiles" on public.clinical_profiles;
drop policy if exists "clinical_update_profiles" on public.clinical_profiles;
drop policy if exists "clinical_delete_profiles" on public.clinical_profiles;

create policy "tenant_select_profiles"
  on public.clinical_profiles for select to authenticated
  using (
    exists (
      select 1
      from public.patients p
      where p.id = clinical_profiles.patient_id
        and public.user_belongs_to_clinic(p.clinic_id)
    )
  );

create policy "tenant_insert_profiles"
  on public.clinical_profiles for insert to authenticated
  with check (
    public.can_write_clinical_data()
    and exists (
      select 1
      from public.patients p
      where p.id = clinical_profiles.patient_id
        and public.user_belongs_to_clinic(p.clinic_id)
    )
  );

create policy "tenant_update_profiles"
  on public.clinical_profiles for update to authenticated
  using (
    public.can_write_clinical_data()
    and exists (
      select 1
      from public.patients p
      where p.id = clinical_profiles.patient_id
        and public.user_belongs_to_clinic(p.clinic_id)
    )
  )
  with check (
    public.can_write_clinical_data()
    and exists (
      select 1
      from public.patients p
      where p.id = clinical_profiles.patient_id
        and public.user_belongs_to_clinic(p.clinic_id)
    )
  );

create policy "tenant_delete_profiles"
  on public.clinical_profiles for delete to authenticated
  using (
    public.get_user_app_role() = 'investigator'::public.app_role
    and exists (
      select 1
      from public.patients p
      where p.id = clinical_profiles.patient_id
        and public.user_belongs_to_clinic(p.clinic_id)
    )
  );

-- protocols
drop policy if exists "clinical_select_protocols" on public.protocols;
drop policy if exists "clinical_insert_protocols" on public.protocols;
drop policy if exists "clinical_update_protocols" on public.protocols;
drop policy if exists "clinical_delete_protocols" on public.protocols;

create policy "tenant_select_protocols"
  on public.protocols for select to authenticated
  using (public.user_belongs_to_clinic(clinic_id));

create policy "tenant_insert_protocols"
  on public.protocols for insert to authenticated
  with check (
    public.get_user_app_role() = 'investigator'::public.app_role
    and public.user_belongs_to_clinic(clinic_id)
  );

create policy "tenant_update_protocols"
  on public.protocols for update to authenticated
  using (
    public.get_user_app_role() = 'investigator'::public.app_role
    and public.user_belongs_to_clinic(clinic_id)
  )
  with check (
    public.get_user_app_role() = 'investigator'::public.app_role
    and public.user_belongs_to_clinic(clinic_id)
  );

create policy "tenant_delete_protocols"
  on public.protocols for delete to authenticated
  using (
    public.get_user_app_role() = 'investigator'::public.app_role
    and public.user_belongs_to_clinic(clinic_id)
  );

-- screenings (via patients)
drop policy if exists "clinical_select_screenings" on public.screenings;
drop policy if exists "clinical_insert_screenings" on public.screenings;
drop policy if exists "clinical_update_screenings" on public.screenings;
drop policy if exists "clinical_delete_screenings" on public.screenings;

create policy "tenant_select_screenings"
  on public.screenings for select to authenticated
  using (
    exists (
      select 1
      from public.patients p
      where p.id = screenings.patient_id
        and public.user_belongs_to_clinic(p.clinic_id)
    )
  );

create policy "tenant_insert_screenings"
  on public.screenings for insert to authenticated
  with check (
    public.can_write_clinical_data()
    and exists (
      select 1
      from public.patients p
      where p.id = screenings.patient_id
        and public.user_belongs_to_clinic(p.clinic_id)
    )
    and exists (
      select 1
      from public.protocols pr
      where pr.id = screenings.protocol_id
        and public.user_belongs_to_clinic(pr.clinic_id)
    )
  );

create policy "tenant_update_screenings"
  on public.screenings for update to authenticated
  using (
    public.can_write_clinical_data()
    and exists (
      select 1
      from public.patients p
      where p.id = screenings.patient_id
        and public.user_belongs_to_clinic(p.clinic_id)
    )
  )
  with check (
    public.can_write_clinical_data()
    and exists (
      select 1
      from public.patients p
      where p.id = screenings.patient_id
        and public.user_belongs_to_clinic(p.clinic_id)
    )
  );

create policy "tenant_delete_screenings"
  on public.screenings for delete to authenticated
  using (
    public.get_user_app_role() = 'investigator'::public.app_role
    and exists (
      select 1
      from public.patients p
      where p.id = screenings.patient_id
        and public.user_belongs_to_clinic(p.clinic_id)
    )
  );

-- audit_logs: lectura solo de registros vinculados al tenant del usuario
drop policy if exists "staff read audit logs" on public.audit_logs;

create policy "tenant_select_audit_logs"
  on public.audit_logs for select to authenticated
  using (
    case table_name
      when 'patients' then exists (
        select 1 from public.patients p
        where p.id = audit_logs.record_id
          and public.user_belongs_to_clinic(p.clinic_id)
      )
      when 'clinical_profiles' then exists (
        select 1
        from public.clinical_profiles cp
        join public.patients p on p.id = cp.patient_id
        where cp.id = audit_logs.record_id
          and public.user_belongs_to_clinic(p.clinic_id)
      )
      when 'protocols' then exists (
        select 1 from public.protocols pr
        where pr.id = audit_logs.record_id
          and public.user_belongs_to_clinic(pr.clinic_id)
      )
      when 'screenings' then exists (
        select 1
        from public.screenings s
        join public.patients p on p.id = s.patient_id
        where s.id = audit_logs.record_id
          and public.user_belongs_to_clinic(p.clinic_id)
      )
      else false
    end
  );

comment on function public.user_belongs_to_clinic(uuid) is
  'True si auth.uid() es miembro de la organización = clinic_id (tenant boundary).';
