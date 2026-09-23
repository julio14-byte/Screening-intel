-- Repara 42703: column "organization_id" does not exist
-- Causa: CREATE TABLE IF NOT EXISTS dejó un stub (sobre todo ehr_sync_logs)
-- sin organization_id, y las policies/índices de 0019 fallaban.

set statement_timeout = '30s';
set lock_timeout = '8s';

create table if not exists public.ehr_sync_logs (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid references public.organizations (id) on delete cascade,
  sync_type           text not null default 'batch'
    check (sync_type in ('batch', 'webhook')),
  status              text not null default 'running'
    check (status in ('running', 'completed', 'partial', 'failed')),
  patients_created    integer not null default 0,
  patients_updated    integer not null default 0,
  patients_failed     integer not null default 0,
  rematch_refreshed   integer not null default 0,
  payload_summary     jsonb not null default '{}'::jsonb,
  error_details       jsonb not null default '[]'::jsonb,
  triggered_by        uuid references auth.users (id) on delete set null,
  started_at          timestamptz not null default now(),
  completed_at        timestamptz
);

do $$
begin
  if to_regclass('public.coordinator_tasks') is not null then
    alter table public.coordinator_tasks
      add column if not exists organization_id uuid references public.organizations (id) on delete cascade;
  end if;

  if to_regclass('public.app_notifications') is not null then
    alter table public.app_notifications
      add column if not exists organization_id uuid references public.organizations (id) on delete cascade;
  end if;

  if to_regclass('public.study_visits') is not null then
    alter table public.study_visits
      add column if not exists organization_id uuid references public.organizations (id) on delete cascade;
  end if;
end
$$;

alter table public.ehr_sync_logs
  add column if not exists organization_id uuid references public.organizations (id) on delete cascade,
  add column if not exists acknowledged_at timestamptz,
  add column if not exists failed_patients jsonb not null default '[]'::jsonb;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ehr_sync_logs'
      and column_name = 'clinic_id'
  ) then
    update public.ehr_sync_logs
    set organization_id = clinic_id
    where organization_id is null
      and clinic_id is not null;
  end if;
end
$$;

create index if not exists ehr_sync_logs_org_started_idx
  on public.ehr_sync_logs (organization_id, started_at desc);

alter table public.ehr_sync_logs enable row level security;

drop policy if exists ehr_sync_logs_select on public.ehr_sync_logs;
create policy ehr_sync_logs_select
  on public.ehr_sync_logs for select to authenticated
  using (ehr_sync_logs.organization_id in (select public.get_user_organization_ids()));

drop policy if exists ehr_sync_logs_update on public.ehr_sync_logs;
create policy ehr_sync_logs_update
  on public.ehr_sync_logs for update to authenticated
  using (ehr_sync_logs.organization_id in (select public.get_user_organization_ids()))
  with check (ehr_sync_logs.organization_id in (select public.get_user_organization_ids()));

grant select, update on table public.ehr_sync_logs to authenticated;
