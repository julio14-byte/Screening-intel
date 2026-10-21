-- Equipo del sitio y bitácora de delegación (ICH-GCP E6 4.1.5): quién del equipo
-- puede hacer qué tareas en cada protocolo, con vigencia de GCP y licencia.
-- El equipo no necesita cuenta en la app; solo el investigador administra.

create table if not exists public.site_staff (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null
    references public.organizations (id) on delete cascade,
  full_name          text not null check (char_length(full_name) between 2 and 160),
  role_title         text not null
    check (role_title in ('principal_investigator', 'sub_investigator', 'coordinator',
                          'nurse', 'pharmacist', 'lab_technician', 'other')),
  email              text check (char_length(email) <= 320),
  professional_license text check (char_length(professional_license) <= 60),
  gcp_expires_on     date,
  license_expires_on date,
  active             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.site_staff is
  'Personal del sitio con vigencia de capacitación GCP y licencia profesional.';

create index if not exists site_staff_org_idx
  on public.site_staff (organization_id, active);

create table if not exists public.delegation_assignments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  staff_id        uuid not null
    references public.site_staff (id) on delete restrict,
  protocol_id     uuid not null
    references public.protocols (id) on delete cascade,
  tasks           text[] not null
    check (
      cardinality(tasks) >= 1
      and tasks <@ array['consent', 'history_physical', 'vitals', 'ecg', 'blood_draw',
                         'ip_dispense', 'ip_accountability', 'randomization',
                         'ae_assessment', 'data_entry', 'lab_processing']::text[]
    ),
  delegated_on    date not null default current_date,
  ended_on        date,
  delegated_by    uuid default auth.uid() references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint delegation_window_check
    check (ended_on is null or ended_on >= delegated_on)
);

comment on table public.delegation_assignments is
  'Bitácora de delegación por protocolo: tareas, fecha de inicio y de término.';

create index if not exists delegation_assignments_org_idx
  on public.delegation_assignments (organization_id, protocol_id);
create index if not exists delegation_assignments_staff_idx
  on public.delegation_assignments (staff_id);

drop trigger if exists site_staff_set_updated_at on public.site_staff;
create trigger site_staff_set_updated_at
  before update on public.site_staff
  for each row execute function public.set_updated_at();

alter table public.site_staff enable row level security;
alter table public.delegation_assignments enable row level security;

drop policy if exists "site_staff_select_member" on public.site_staff;
create policy "site_staff_select_member"
  on public.site_staff for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "site_staff_insert_investigator" on public.site_staff;
create policy "site_staff_insert_investigator"
  on public.site_staff for insert to authenticated
  with check (
    (select public.can_manage_clinical_roles())
    and organization_id in (select public.get_user_organization_ids())
  );

drop policy if exists "site_staff_update_investigator" on public.site_staff;
create policy "site_staff_update_investigator"
  on public.site_staff for update to authenticated
  using (
    (select public.can_manage_clinical_roles())
    and organization_id in (select public.get_user_organization_ids())
  )
  with check (
    (select public.can_manage_clinical_roles())
    and organization_id in (select public.get_user_organization_ids())
  );

drop policy if exists "delegations_select_member" on public.delegation_assignments;
create policy "delegations_select_member"
  on public.delegation_assignments for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "delegations_insert_investigator" on public.delegation_assignments;
create policy "delegations_insert_investigator"
  on public.delegation_assignments for insert to authenticated
  with check (
    (select public.can_manage_clinical_roles())
    and organization_id in (select public.get_user_organization_ids())
    and staff_id in (
      select st.id from public.site_staff st
      where st.organization_id in (select public.get_user_organization_ids())
    )
    and protocol_id in (
      select p.id from public.protocols p
      where p.clinic_id in (select public.get_user_organization_ids())
    )
  );

drop policy if exists "delegations_update_investigator" on public.delegation_assignments;
create policy "delegations_update_investigator"
  on public.delegation_assignments for update to authenticated
  using (
    (select public.can_manage_clinical_roles())
    and organization_id in (select public.get_user_organization_ids())
  )
  with check (
    (select public.can_manage_clinical_roles())
    and organization_id in (select public.get_user_organization_ids())
  );

revoke all on table public.site_staff from anon;
revoke all on table public.site_staff from authenticated;
grant select, insert, update on table public.site_staff to authenticated;

-- La delegación es un registro: solo se puede cerrar con fecha de término.
revoke all on table public.delegation_assignments from anon;
revoke all on table public.delegation_assignments from authenticated;
grant select, insert on table public.delegation_assignments to authenticated;
grant update (ended_on) on table public.delegation_assignments to authenticated;

drop trigger if exists site_staff_audit_trail on public.site_staff;
create trigger site_staff_audit_trail
  after update or delete on public.site_staff
  for each row execute function audit.capture_row_change();

drop trigger if exists delegation_assignments_audit_trail on public.delegation_assignments;
create trigger delegation_assignments_audit_trail
  after update or delete on public.delegation_assignments
  for each row execute function audit.capture_row_change();
