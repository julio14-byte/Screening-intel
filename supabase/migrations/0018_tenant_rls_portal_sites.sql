-- =============================================================================
-- Aislamiento tenant: función de membresía, quitar using(true), portal sin secretos
-- =============================================================================
-- Postgres OR-ea políticas PERMISSIVE: las clinical_* de 0007/0014 con using(true)
-- anulan las tenant_* de 0016. Esta migración las elimina y recrea las tenant.
-- Si 0016 o 0017 fallaron por falta de get_user_organization_ids(), re-ejecutar
-- este archivo alcanza (drop/create idempotente).

set statement_timeout = '30s';
set lock_timeout = '8s';

-- -----------------------------------------------------------------------------
-- 1) Membresías del usuario autenticado (InitPlan en políticas RLS)
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

revoke all on function public.get_user_organization_ids() from public;
grant execute on function public.get_user_organization_ids() to authenticated;

-- -----------------------------------------------------------------------------
-- 2) Quitar políticas abiertas (select using true + writes sin clinic_id)
-- -----------------------------------------------------------------------------
drop policy if exists "mvp full access patients" on public.patients;
drop policy if exists "clinical_select_patients" on public.patients;
drop policy if exists "clinical_insert_patients" on public.patients;
drop policy if exists "clinical_update_patients" on public.patients;
drop policy if exists "clinical_delete_patients" on public.patients;
drop policy if exists "clinical_write_patients" on public.patients;

drop policy if exists "mvp full access clinical_profiles" on public.clinical_profiles;
drop policy if exists "clinical_select_profiles" on public.clinical_profiles;
drop policy if exists "clinical_insert_profiles" on public.clinical_profiles;
drop policy if exists "clinical_update_profiles" on public.clinical_profiles;
drop policy if exists "clinical_delete_profiles" on public.clinical_profiles;
drop policy if exists "clinical_write_profiles" on public.clinical_profiles;

drop policy if exists "mvp full access protocols" on public.protocols;
drop policy if exists "clinical_select_protocols" on public.protocols;
drop policy if exists "clinical_insert_protocols" on public.protocols;
drop policy if exists "clinical_update_protocols" on public.protocols;
drop policy if exists "clinical_delete_protocols" on public.protocols;
drop policy if exists "clinical_write_protocols" on public.protocols;

drop policy if exists "mvp full access screenings" on public.screenings;
drop policy if exists "clinical_select_screenings" on public.screenings;
drop policy if exists "clinical_insert_screenings" on public.screenings;
drop policy if exists "clinical_update_screenings" on public.screenings;
drop policy if exists "clinical_delete_screenings" on public.screenings;
drop policy if exists "clinical_write_screenings" on public.screenings;

drop policy if exists "staff read audit logs" on public.audit_logs;

-- Portal: authenticated no debe ver orgs ajenas con portal_enabled
drop policy if exists "organizations_select_portal_public" on public.organizations;

-- -----------------------------------------------------------------------------
-- 3) Recrear políticas tenant (idempotente; igual que 0016)
-- -----------------------------------------------------------------------------
drop policy if exists "tenant_select_patients" on public.patients;
create policy "tenant_select_patients"
  on public.patients for select to authenticated
  using (clinic_id in (select public.get_user_organization_ids()));

drop policy if exists "tenant_insert_patients" on public.patients;
create policy "tenant_insert_patients"
  on public.patients for insert to authenticated
  with check (
    (select public.can_write_clinical_data())
    and clinic_id in (select public.get_user_organization_ids())
  );

drop policy if exists "tenant_update_patients" on public.patients;
create policy "tenant_update_patients"
  on public.patients for update to authenticated
  using (
    (select public.can_write_clinical_data())
    and clinic_id in (select public.get_user_organization_ids())
  )
  with check (
    (select public.can_write_clinical_data())
    and clinic_id in (select public.get_user_organization_ids())
  );

drop policy if exists "tenant_delete_patients" on public.patients;
create policy "tenant_delete_patients"
  on public.patients for delete to authenticated
  using (
    (select public.get_user_app_role()) = 'investigator'::public.app_role
    and clinic_id in (select public.get_user_organization_ids())
  );

drop policy if exists "tenant_select_profiles" on public.clinical_profiles;
create policy "tenant_select_profiles"
  on public.clinical_profiles for select to authenticated
  using (
    patient_id in (
      select p.id from public.patients p
      where p.clinic_id in (select public.get_user_organization_ids())
    )
  );

drop policy if exists "tenant_insert_profiles" on public.clinical_profiles;
create policy "tenant_insert_profiles"
  on public.clinical_profiles for insert to authenticated
  with check (
    (select public.can_write_clinical_data())
    and patient_id in (
      select p.id from public.patients p
      where p.clinic_id in (select public.get_user_organization_ids())
    )
  );

drop policy if exists "tenant_update_profiles" on public.clinical_profiles;
create policy "tenant_update_profiles"
  on public.clinical_profiles for update to authenticated
  using (
    (select public.can_write_clinical_data())
    and patient_id in (
      select p.id from public.patients p
      where p.clinic_id in (select public.get_user_organization_ids())
    )
  )
  with check (
    (select public.can_write_clinical_data())
    and patient_id in (
      select p.id from public.patients p
      where p.clinic_id in (select public.get_user_organization_ids())
    )
  );

drop policy if exists "tenant_delete_profiles" on public.clinical_profiles;
create policy "tenant_delete_profiles"
  on public.clinical_profiles for delete to authenticated
  using (
    (select public.get_user_app_role()) = 'investigator'::public.app_role
    and patient_id in (
      select p.id from public.patients p
      where p.clinic_id in (select public.get_user_organization_ids())
    )
  );

drop policy if exists "tenant_select_protocols" on public.protocols;
create policy "tenant_select_protocols"
  on public.protocols for select to authenticated
  using (clinic_id in (select public.get_user_organization_ids()));

drop policy if exists "tenant_insert_protocols" on public.protocols;
create policy "tenant_insert_protocols"
  on public.protocols for insert to authenticated
  with check (
    (select public.get_user_app_role()) = 'investigator'::public.app_role
    and clinic_id in (select public.get_user_organization_ids())
  );

drop policy if exists "tenant_update_protocols" on public.protocols;
create policy "tenant_update_protocols"
  on public.protocols for update to authenticated
  using (
    (select public.get_user_app_role()) = 'investigator'::public.app_role
    and clinic_id in (select public.get_user_organization_ids())
  )
  with check (
    (select public.get_user_app_role()) = 'investigator'::public.app_role
    and clinic_id in (select public.get_user_organization_ids())
  );

drop policy if exists "tenant_delete_protocols" on public.protocols;
create policy "tenant_delete_protocols"
  on public.protocols for delete to authenticated
  using (
    (select public.get_user_app_role()) = 'investigator'::public.app_role
    and clinic_id in (select public.get_user_organization_ids())
  );

drop policy if exists "tenant_select_screenings" on public.screenings;
create policy "tenant_select_screenings"
  on public.screenings for select to authenticated
  using (
    patient_id in (
      select p.id from public.patients p
      where p.clinic_id in (select public.get_user_organization_ids())
    )
  );

drop policy if exists "tenant_insert_screenings" on public.screenings;
create policy "tenant_insert_screenings"
  on public.screenings for insert to authenticated
  with check (
    (select public.can_write_clinical_data())
    and patient_id in (
      select p.id from public.patients p
      where p.clinic_id in (select public.get_user_organization_ids())
    )
    and protocol_id in (
      select pr.id from public.protocols pr
      where pr.clinic_id in (select public.get_user_organization_ids())
    )
  );

drop policy if exists "tenant_update_screenings" on public.screenings;
create policy "tenant_update_screenings"
  on public.screenings for update to authenticated
  using (
    (select public.can_write_clinical_data())
    and patient_id in (
      select p.id from public.patients p
      where p.clinic_id in (select public.get_user_organization_ids())
    )
  )
  with check (
    (select public.can_write_clinical_data())
    and patient_id in (
      select p.id from public.patients p
      where p.clinic_id in (select public.get_user_organization_ids())
    )
  );

drop policy if exists "tenant_delete_screenings" on public.screenings;
create policy "tenant_delete_screenings"
  on public.screenings for delete to authenticated
  using (
    (select public.get_user_app_role()) = 'investigator'::public.app_role
    and patient_id in (
      select p.id from public.patients p
      where p.clinic_id in (select public.get_user_organization_ids())
    )
  );

drop policy if exists "tenant_select_audit_logs" on public.audit_logs;
create policy "tenant_select_audit_logs"
  on public.audit_logs for select to authenticated
  using (
    case table_name
      when 'patients' then record_id in (
        select p.id from public.patients p
        where p.clinic_id in (select public.get_user_organization_ids())
      )
      when 'clinical_profiles' then record_id in (
        select cp.id
        from public.clinical_profiles cp
        join public.patients p on p.id = cp.patient_id
        where p.clinic_id in (select public.get_user_organization_ids())
      )
      when 'protocols' then record_id in (
        select pr.id from public.protocols pr
        where pr.clinic_id in (select public.get_user_organization_ids())
      )
      when 'screenings' then record_id in (
        select s.id
        from public.screenings s
        join public.patients p on p.id = s.patient_id
        where p.clinic_id in (select public.get_user_organization_ids())
      )
      else false
    end
  );

-- ePRO (idempotente; cubre installs donde 0017 falló por la función faltante)
revoke all on table public.epro_forms from anon;
revoke all on table public.epro_responses from anon;

drop policy if exists "mvp full access epro_forms" on public.epro_forms;
drop policy if exists "mvp full access epro_responses" on public.epro_responses;
drop policy if exists "tenant_select_epro_forms" on public.epro_forms;
drop policy if exists "tenant_write_epro_forms" on public.epro_forms;
drop policy if exists "tenant_select_epro_responses" on public.epro_responses;
drop policy if exists "tenant_write_epro_responses" on public.epro_responses;
drop policy if exists "tenant_update_epro_responses" on public.epro_responses;
drop policy if exists "tenant_delete_epro_responses" on public.epro_responses;

create policy "tenant_select_epro_forms"
  on public.epro_forms for select to authenticated
  using (
    protocol_id is null
    or protocol_id in (
      select pr.id from public.protocols pr
      where pr.clinic_id in (select public.get_user_organization_ids())
    )
  );

create policy "tenant_write_epro_forms"
  on public.epro_forms for all to authenticated
  using (
    (select public.is_clinical_lead())
    and (
      protocol_id is null
      or protocol_id in (
        select pr.id from public.protocols pr
        where pr.clinic_id in (select public.get_user_organization_ids())
      )
    )
  )
  with check (
    (select public.is_clinical_lead())
    and (
      protocol_id is null
      or protocol_id in (
        select pr.id from public.protocols pr
        where pr.clinic_id in (select public.get_user_organization_ids())
      )
    )
  );

create policy "tenant_select_epro_responses"
  on public.epro_responses for select to authenticated
  using (
    patient_id in (
      select p.id from public.patients p
      where p.clinic_id in (select public.get_user_organization_ids())
    )
  );

create policy "tenant_write_epro_responses"
  on public.epro_responses for insert to authenticated
  with check (
    (select public.can_write_clinical_data())
    and patient_id in (
      select p.id from public.patients p
      where p.clinic_id in (select public.get_user_organization_ids())
    )
  );

create policy "tenant_update_epro_responses"
  on public.epro_responses for update to authenticated
  using (
    (select public.can_write_clinical_data())
    and patient_id in (
      select p.id from public.patients p
      where p.clinic_id in (select public.get_user_organization_ids())
    )
  )
  with check (
    (select public.can_write_clinical_data())
    and patient_id in (
      select p.id from public.patients p
      where p.clinic_id in (select public.get_user_organization_ids())
    )
  );

create policy "tenant_delete_epro_responses"
  on public.epro_responses for delete to authenticated
  using (
    (select public.is_clinical_lead())
    and patient_id in (
      select p.id from public.patients p
      where p.clinic_id in (select public.get_user_organization_ids())
    )
  );

-- -----------------------------------------------------------------------------
-- 4) Portal público: vista sin secretos; anon no lee organizations
-- -----------------------------------------------------------------------------
-- La vista corre como owner (no security_invoker) para no exigir GRANT en
-- organizations. Solo expone id, name, slug, portal_enabled.

create or replace view public.portal_sites as
select o.id, o.name, o.slug, o.portal_enabled
from public.organizations o
where o.portal_enabled = true;

comment on view public.portal_sites is
  'Directorio público de centros con portal activo. Sin secretos ni facturación.';

grant select on public.portal_sites to anon, authenticated;
revoke select on table public.organizations from anon;

-- Protocolos del formulario público: solo anon (staff usa tenant_select_protocols)
drop policy if exists "protocols_select_portal_public" on public.protocols;
create policy "protocols_select_portal_public"
  on public.protocols for select
  to anon
  using (
    status = 'active'::public.protocol_status
    and exists (
      select 1
      from public.organizations o
      where o.portal_enabled = true
        and o.id = protocols.clinic_id
    )
  );

grant select on table public.protocols to anon;

revoke select (ehr_webhook_secret) on public.organizations from anon;
revoke select (ehr_webhook_secret) on public.organizations from authenticated;
