-- =============================================================================
-- Bajar Disk IO: políticas RLS evaluadas una vez (InitPlan) en vez de por fila
-- =============================================================================
-- Reemplaza user_belongs_to_clinic(clinic_id) en cada fila por:
--   clinic_id IN (SELECT public.get_user_organization_ids())
-- Postgres cachea el subquery. Requiere migraciones 0008+.

-- patients
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

-- clinical_profiles
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

-- protocols (no tocar protocols_select_portal_public de 0013)
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

-- screenings
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

-- audit_logs
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
