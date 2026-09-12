-- =============================================================================
-- 0019 — Asignación de protocolos (ACL por estudio) + documentos cifrados
-- =============================================================================
-- Corre DESPUÉS de 0018_tenant_rls_portal_sites.sql.
-- (En PRs aislados este archivo se llamó 0017; 0017 ya es secure_patient_data.)
-- • Sub-investigador, coordinador y monitor solo ven protocolos asignados.
-- • El investigador principal (PI) ve todos los del centro y asigna el equipo.
-- • PDFs / fotos del expediente van a Storage privado (no BYTEA). El cifrado
--   AES-256-GCM lo aplica la API con DOCUMENT_ENCRYPTION_KEY.
-- El portal público (/candidato) sigue leyendo protocolos activos como anon.

set statement_timeout = '30s';
set lock_timeout = '8s';

-- -----------------------------------------------------------------------------
-- Membresías (por si 0016 se aplicó sin esta función)
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

-- PI del site: ve y administra todos los protocolos de su organización
create or replace function public.can_view_all_org_protocols()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.get_user_app_role() = 'investigator'::public.app_role;
$$;

revoke all on function public.can_view_all_org_protocols() from public;
grant execute on function public.can_view_all_org_protocols() to authenticated;

-- -----------------------------------------------------------------------------
-- protocol_assignments
-- -----------------------------------------------------------------------------
create table if not exists public.protocol_assignments (
  id           uuid primary key default gen_random_uuid(),
  protocol_id  uuid not null references public.protocols (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  assigned_by  uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  constraint protocol_assignments_unique unique (protocol_id, user_id)
);

comment on table public.protocol_assignments is
  'Staff asignado a un protocolo. Coordinador / sub-I / monitor solo ven esos estudios.';

create index if not exists protocol_assignments_user_idx
  on public.protocol_assignments (user_id, protocol_id);
create index if not exists protocol_assignments_protocol_idx
  on public.protocol_assignments (protocol_id);

create or replace function public.user_assigned_protocol_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select pa.protocol_id
  from public.protocol_assignments pa
  where pa.user_id = auth.uid();
$$;

revoke all on function public.user_assigned_protocol_ids() from public;
grant execute on function public.user_assigned_protocol_ids() to authenticated;

create or replace function public.assign_protocol_creator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    insert into public.protocol_assignments (protocol_id, user_id, assigned_by)
    values (new.id, auth.uid(), auth.uid())
    on conflict (protocol_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists protocols_assign_creator on public.protocols;
create trigger protocols_assign_creator
  after insert on public.protocols
  for each row execute function public.assign_protocol_creator();

alter table public.protocol_assignments enable row level security;

grant select, insert, delete on table public.protocol_assignments to authenticated;

drop policy if exists "tenant_select_protocol_assignments" on public.protocol_assignments;
create policy "tenant_select_protocol_assignments"
  on public.protocol_assignments for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      (select public.can_view_all_org_protocols())
      and protocol_id in (
        select pr.id from public.protocols pr
        where pr.clinic_id in (select public.get_user_organization_ids())
      )
    )
  );

drop policy if exists "tenant_insert_protocol_assignments" on public.protocol_assignments;
create policy "tenant_insert_protocol_assignments"
  on public.protocol_assignments for insert to authenticated
  with check (
    (select public.can_view_all_org_protocols())
    and protocol_id in (
      select pr.id from public.protocols pr
      where pr.clinic_id in (select public.get_user_organization_ids())
    )
  );

drop policy if exists "tenant_delete_protocol_assignments" on public.protocol_assignments;
create policy "tenant_delete_protocol_assignments"
  on public.protocol_assignments for delete to authenticated
  using (
    (select public.can_view_all_org_protocols())
    and protocol_id in (
      select pr.id from public.protocols pr
      where pr.clinic_id in (select public.get_user_organization_ids())
    )
  );

-- Políticas abiertas que anularían el ACL (0014)
drop policy if exists "clinical_select_protocols" on public.protocols;
drop policy if exists "mvp full access protocols" on public.protocols;

-- Portal: solo anon. El staff autenticado usa tenant + asignación.
drop policy if exists "protocols_select_portal_public" on public.protocols;
create policy "protocols_select_portal_public"
  on public.protocols for select
  to anon
  using (
    status = 'active'::public.protocol_status
    and exists (
      select 1
      from public.organizations o
      where o.id = protocols.clinic_id
        and o.portal_enabled = true
    )
  );

drop policy if exists "tenant_select_protocols" on public.protocols;
create policy "tenant_select_protocols"
  on public.protocols for select to authenticated
  using (
    clinic_id in (select public.get_user_organization_ids())
    and (
      (select public.can_view_all_org_protocols())
      or id in (select public.user_assigned_protocol_ids())
    )
  );

-- Screenings del protocolo: misma visibilidad que el estudio
drop policy if exists "tenant_select_screenings" on public.screenings;
create policy "tenant_select_screenings"
  on public.screenings for select to authenticated
  using (
    protocol_id in (
      select pr.id
      from public.protocols pr
      where pr.clinic_id in (select public.get_user_organization_ids())
        and (
          (select public.can_view_all_org_protocols())
          or pr.id in (select public.user_assigned_protocol_ids())
        )
    )
  );

drop policy if exists "tenant_insert_screenings" on public.screenings;
create policy "tenant_insert_screenings"
  on public.screenings for insert to authenticated
  with check (
    (select public.can_write_clinical_data())
    and protocol_id in (
      select pr.id
      from public.protocols pr
      where pr.clinic_id in (select public.get_user_organization_ids())
        and (
          (select public.can_view_all_org_protocols())
          or pr.id in (select public.user_assigned_protocol_ids())
        )
    )
  );

drop policy if exists "tenant_update_screenings" on public.screenings;
create policy "tenant_update_screenings"
  on public.screenings for update to authenticated
  using (
    (select public.can_write_clinical_data())
    and protocol_id in (
      select pr.id
      from public.protocols pr
      where pr.clinic_id in (select public.get_user_organization_ids())
        and (
          (select public.can_view_all_org_protocols())
          or pr.id in (select public.user_assigned_protocol_ids())
        )
    )
  )
  with check (
    (select public.can_write_clinical_data())
    and protocol_id in (
      select pr.id
      from public.protocols pr
      where pr.clinic_id in (select public.get_user_organization_ids())
        and (
          (select public.can_view_all_org_protocols())
          or pr.id in (select public.user_assigned_protocol_ids())
        )
    )
  );

-- Backfill: el PI del centro queda asignado a los protocolos ya existentes
insert into public.protocol_assignments (protocol_id, user_id)
select pr.id, ur.user_id
from public.protocols pr
join public.user_roles ur on ur.role = 'investigator'::public.app_role
join public.organization_members om
  on om.user_id = ur.user_id
 and om.organization_id = pr.clinic_id
on conflict (protocol_id, user_id) do nothing;

-- -----------------------------------------------------------------------------
-- clinical_documents — metadatos; el binario vive en Storage
-- -----------------------------------------------------------------------------
create table if not exists public.clinical_documents (
  id                 uuid primary key default gen_random_uuid(),
  clinic_id          uuid not null,
  patient_id         uuid not null references public.patients (id) on delete cascade,
  kind               text not null
    check (kind in ('lab_pdf', 'prescription_photo', 'other')),
  original_filename  text not null,
  content_type       text not null,
  byte_size          integer not null check (byte_size > 0),
  sha256             text not null,
  storage_path       text not null unique,
  encryption         text not null
    check (encryption in ('aes-256-gcm', 'storage_at_rest')),
  uploaded_by        uuid references auth.users (id) on delete set null,
  created_at         timestamptz not null default now()
);

comment on table public.clinical_documents is
  'Fuente del expediente (PDF de lab / foto de receta). El archivo está cifrado en el bucket clinical-documents.';

create index if not exists clinical_documents_patient_idx
  on public.clinical_documents (patient_id, created_at desc);
create index if not exists clinical_documents_clinic_idx
  on public.clinical_documents (clinic_id);

alter table public.clinical_documents enable row level security;

grant select, insert, delete on table public.clinical_documents to authenticated;

drop policy if exists "tenant_select_clinical_documents" on public.clinical_documents;
create policy "tenant_select_clinical_documents"
  on public.clinical_documents for select to authenticated
  using (clinic_id in (select public.get_user_organization_ids()));

drop policy if exists "tenant_insert_clinical_documents" on public.clinical_documents;
create policy "tenant_insert_clinical_documents"
  on public.clinical_documents for insert to authenticated
  with check (
    (select public.can_write_clinical_data())
    and clinic_id in (select public.get_user_organization_ids())
    and patient_id in (
      select p.id from public.patients p
      where p.clinic_id = clinical_documents.clinic_id
    )
  );

drop policy if exists "tenant_delete_clinical_documents" on public.clinical_documents;
create policy "tenant_delete_clinical_documents"
  on public.clinical_documents for delete to authenticated
  using (
    clinic_id in (select public.get_user_organization_ids())
    and (
      (select public.get_user_app_role()) = 'investigator'::public.app_role
      or uploaded_by = (select auth.uid())
    )
  );

-- Bitácora
drop trigger if exists protocol_assignments_audit_trail on public.protocol_assignments;
create trigger protocol_assignments_audit_trail
  after update or delete on public.protocol_assignments
  for each row execute function audit.capture_row_change();

drop trigger if exists clinical_documents_audit_trail on public.clinical_documents;
create trigger clinical_documents_audit_trail
  after update or delete on public.clinical_documents
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
      else false
    end
  );

-- Bucket privado. Sin políticas para authenticated: solo service_role (API).
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit)
    values ('clinical-documents', 'clinical-documents', false, 8388608)
    on conflict (id) do update
    set public = excluded.public,
        file_size_limit = excluded.file_size_limit;
  end if;
end $$;
