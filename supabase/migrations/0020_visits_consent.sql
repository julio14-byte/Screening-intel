-- =============================================================================
-- 0020 — Agenda de visitas + consentimiento informado
-- =============================================================================
-- Corre DESPUÉS de 0019_protocol_assignments_encrypted_docs.sql.
-- • Visitas de pre-screening, ICF, labs, screening y randomización.
-- • ICF por paciente + protocolo (versión, fecha, quién lo tomó, PDF cifrado).
-- • ACL: si la visita/consentimiento tiene protocolo, aplica la asignación
--   del estudio; el registro de pacientes del centro sigue visible.

set statement_timeout = '30s';
set lock_timeout = '8s';

create or replace function public.can_access_protocol(p_protocol_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.protocols pr
    where pr.id = p_protocol_id
      and pr.clinic_id in (select public.get_user_organization_ids())
      and (
        (select public.can_view_all_org_protocols())
        or pr.id in (select public.user_assigned_protocol_ids())
      )
  );
$$;

revoke all on function public.can_access_protocol(uuid) from public;
grant execute on function public.can_access_protocol(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- ICF como documento cifrado
-- -----------------------------------------------------------------------------
alter table public.clinical_documents
  drop constraint if exists clinical_documents_kind_check;

alter table public.clinical_documents
  add constraint clinical_documents_kind_check
  check (kind in ('lab_pdf', 'prescription_photo', 'informed_consent', 'other'));

-- -----------------------------------------------------------------------------
-- study_visits
-- -----------------------------------------------------------------------------
create table if not exists public.study_visits (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null,
  patient_id    uuid not null references public.patients (id) on delete cascade,
  protocol_id   uuid references public.protocols (id) on delete set null,
  visit_type    text not null
    check (visit_type in (
      'pre_screening',
      'consent',
      'labs',
      'screening',
      'randomization',
      'other'
    )),
  scheduled_at  timestamptz not null,
  status        text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'no_show', 'cancelled')),
  notes         text,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.study_visits is
  'Agenda operativa del site: visitas de screening, ICF, labs y randomización.';

create index if not exists study_visits_clinic_schedule_idx
  on public.study_visits (clinic_id, scheduled_at);
create index if not exists study_visits_patient_idx
  on public.study_visits (patient_id, scheduled_at desc);

alter table public.study_visits enable row level security;
grant select, insert, update, delete on table public.study_visits to authenticated;

drop policy if exists "tenant_select_study_visits" on public.study_visits;
create policy "tenant_select_study_visits"
  on public.study_visits for select to authenticated
  using (
    clinic_id in (select public.get_user_organization_ids())
    and (
      protocol_id is null
      or public.can_access_protocol(protocol_id)
    )
  );

drop policy if exists "tenant_insert_study_visits" on public.study_visits;
create policy "tenant_insert_study_visits"
  on public.study_visits for insert to authenticated
  with check (
    (select public.can_write_clinical_data())
    and clinic_id in (select public.get_user_organization_ids())
    and patient_id in (
      select p.id from public.patients p
      where p.clinic_id = study_visits.clinic_id
    )
    and (
      protocol_id is null
      or public.can_access_protocol(protocol_id)
    )
  );

drop policy if exists "tenant_update_study_visits" on public.study_visits;
create policy "tenant_update_study_visits"
  on public.study_visits for update to authenticated
  using (
    (select public.can_write_clinical_data())
    and clinic_id in (select public.get_user_organization_ids())
    and (
      protocol_id is null
      or public.can_access_protocol(protocol_id)
    )
  )
  with check (
    (select public.can_write_clinical_data())
    and clinic_id in (select public.get_user_organization_ids())
    and (
      protocol_id is null
      or public.can_access_protocol(protocol_id)
    )
  );

drop policy if exists "tenant_delete_study_visits" on public.study_visits;
create policy "tenant_delete_study_visits"
  on public.study_visits for delete to authenticated
  using (
    (select public.can_write_clinical_data())
    and clinic_id in (select public.get_user_organization_ids())
    and (
      protocol_id is null
      or public.can_access_protocol(protocol_id)
    )
  );

-- -----------------------------------------------------------------------------
-- informed_consents
-- -----------------------------------------------------------------------------
create table if not exists public.informed_consents (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null,
  patient_id    uuid not null references public.patients (id) on delete cascade,
  protocol_id   uuid not null references public.protocols (id) on delete cascade,
  icf_version   text not null,
  consented_at  date not null,
  captured_by   uuid references auth.users (id) on delete set null,
  document_id   uuid references public.clinical_documents (id) on delete set null,
  status        text not null default 'obtained'
    check (status in ('obtained', 'withdrawn')),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint informed_consents_version_unique
    unique (patient_id, protocol_id, icf_version)
);

comment on table public.informed_consents is
  'Consentimiento informado por protocolo: versión, fecha, responsable y PDF cifrado opcional.';

create index if not exists informed_consents_patient_idx
  on public.informed_consents (patient_id, protocol_id);
create index if not exists informed_consents_clinic_idx
  on public.informed_consents (clinic_id);

alter table public.informed_consents enable row level security;
grant select, insert, update on table public.informed_consents to authenticated;

drop policy if exists "tenant_select_informed_consents" on public.informed_consents;
create policy "tenant_select_informed_consents"
  on public.informed_consents for select to authenticated
  using (
    clinic_id in (select public.get_user_organization_ids())
    and public.can_access_protocol(protocol_id)
  );

drop policy if exists "tenant_insert_informed_consents" on public.informed_consents;
create policy "tenant_insert_informed_consents"
  on public.informed_consents for insert to authenticated
  with check (
    (select public.can_write_clinical_data())
    and clinic_id in (select public.get_user_organization_ids())
    and patient_id in (
      select p.id from public.patients p
      where p.clinic_id = informed_consents.clinic_id
    )
    and public.can_access_protocol(protocol_id)
  );

drop policy if exists "tenant_update_informed_consents" on public.informed_consents;
create policy "tenant_update_informed_consents"
  on public.informed_consents for update to authenticated
  using (
    (select public.can_write_clinical_data())
    and clinic_id in (select public.get_user_organization_ids())
    and public.can_access_protocol(protocol_id)
  )
  with check (
    (select public.can_write_clinical_data())
    and clinic_id in (select public.get_user_organization_ids())
    and public.can_access_protocol(protocol_id)
  );

drop trigger if exists study_visits_audit_trail on public.study_visits;
create trigger study_visits_audit_trail
  after update or delete on public.study_visits
  for each row execute function audit.capture_row_change();

drop trigger if exists informed_consents_audit_trail on public.informed_consents;
create trigger informed_consents_audit_trail
  after update or delete on public.informed_consents
  for each row execute function audit.capture_row_change();

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
          and (
            (select public.can_view_all_org_protocols())
            or pr.id in (select public.user_assigned_protocol_ids())
          )
      )
      when 'screenings' then record_id in (
        select s.id
        from public.screenings s
        where s.protocol_id in (
          select pr.id from public.protocols pr
          where pr.clinic_id in (select public.get_user_organization_ids())
            and (
              (select public.can_view_all_org_protocols())
              or pr.id in (select public.user_assigned_protocol_ids())
            )
        )
      )
      when 'protocol_assignments' then record_id in (
        select pa.id
        from public.protocol_assignments pa
        join public.protocols pr on pr.id = pa.protocol_id
        where pr.clinic_id in (select public.get_user_organization_ids())
          and (
            (select public.can_view_all_org_protocols())
            or pr.id in (select public.user_assigned_protocol_ids())
          )
      )
      when 'clinical_documents' then record_id in (
        select d.id from public.clinical_documents d
        where d.clinic_id in (select public.get_user_organization_ids())
      )
      when 'study_visits' then record_id in (
        select v.id from public.study_visits v
        where v.clinic_id in (select public.get_user_organization_ids())
          and (
            v.protocol_id is null
            or public.can_access_protocol(v.protocol_id)
          )
      )
      when 'informed_consents' then record_id in (
        select c.id from public.informed_consents c
        where c.clinic_id in (select public.get_user_organization_ids())
          and public.can_access_protocol(c.protocol_id)
      )
      else false
    end
  );
