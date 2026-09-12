-- =============================================================================
-- Paso 1 — asegurar datos: ePRO tenant, bitácora sin anon, secreto EHR oculto
-- =============================================================================
-- Si el SQL Editor corta la conexión, ejecuta las secciones por separado.
-- get_user_organization_ids() también se crea (idempotente) en 0018.

set statement_timeout = '30s';
set lock_timeout = '8s';

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
-- 1) ePRO: nadie anónimo; solo el centro del paciente / protocolo
-- -----------------------------------------------------------------------------
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
-- 2) Bitácora: visitantes sin sesión no pueden registrar eventos
-- -----------------------------------------------------------------------------
revoke execute on function public.record_custom_audit_event(text, uuid, text, jsonb, uuid)
  from anon;

-- -----------------------------------------------------------------------------
-- 3) Secreto EHR: authenticated/anon no pueden leer la columna
--    (service_role / API servidor sí)
-- -----------------------------------------------------------------------------
revoke select (ehr_webhook_secret) on public.organizations from anon;
revoke select (ehr_webhook_secret) on public.organizations from authenticated;
