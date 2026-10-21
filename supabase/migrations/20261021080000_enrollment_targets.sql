-- Metas de enrolamiento por protocolo: randomizados comprometidos con el patrocinador
-- y ventana de reclutamiento. El avance se calcula en la app a partir de screenings.

create table if not exists public.protocol_enrollment_targets (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null
    references public.organizations (id) on delete cascade,
  protocol_id       uuid not null unique
    references public.protocols (id) on delete cascade,
  target_randomized integer not null
    check (target_randomized between 1 and 100000),
  start_date        date,
  end_date          date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint enrollment_targets_window_check
    check (start_date is null or end_date is null or end_date >= start_date)
);

comment on table public.protocol_enrollment_targets is
  'Meta de randomizados y ventana de reclutamiento por protocolo.';

create index if not exists enrollment_targets_org_idx
  on public.protocol_enrollment_targets (organization_id);

drop trigger if exists enrollment_targets_set_updated_at on public.protocol_enrollment_targets;
create trigger enrollment_targets_set_updated_at
  before update on public.protocol_enrollment_targets
  for each row execute function public.set_updated_at();

alter table public.protocol_enrollment_targets enable row level security;

drop policy if exists "enrollment_targets_select_member" on public.protocol_enrollment_targets;
create policy "enrollment_targets_select_member"
  on public.protocol_enrollment_targets for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "enrollment_targets_insert_writer" on public.protocol_enrollment_targets;
create policy "enrollment_targets_insert_writer"
  on public.protocol_enrollment_targets for insert to authenticated
  with check (
    (select public.can_write_clinical_data())
    and organization_id in (select public.get_user_organization_ids())
    and protocol_id in (
      select p.id from public.protocols p
      where p.clinic_id in (select public.get_user_organization_ids())
    )
  );

drop policy if exists "enrollment_targets_update_writer" on public.protocol_enrollment_targets;
create policy "enrollment_targets_update_writer"
  on public.protocol_enrollment_targets for update to authenticated
  using (
    (select public.can_write_clinical_data())
    and organization_id in (select public.get_user_organization_ids())
  )
  with check (
    (select public.can_write_clinical_data())
    and organization_id in (select public.get_user_organization_ids())
    and protocol_id in (
      select p.id from public.protocols p
      where p.clinic_id in (select public.get_user_organization_ids())
    )
  );

drop policy if exists "enrollment_targets_delete_writer" on public.protocol_enrollment_targets;
create policy "enrollment_targets_delete_writer"
  on public.protocol_enrollment_targets for delete to authenticated
  using (
    (select public.can_write_clinical_data())
    and organization_id in (select public.get_user_organization_ids())
  );

revoke all on table public.protocol_enrollment_targets from anon;
revoke all on table public.protocol_enrollment_targets from authenticated;
grant select, insert, update, delete
  on table public.protocol_enrollment_targets to authenticated;

drop trigger if exists enrollment_targets_audit_trail on public.protocol_enrollment_targets;
create trigger enrollment_targets_audit_trail
  after update or delete on public.protocol_enrollment_targets
  for each row execute function audit.capture_row_change();
