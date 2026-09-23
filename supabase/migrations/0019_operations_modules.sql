-- Tareas de cola, avisos, agenda y cierre de fallos EHR.
-- Idempotente. Requiere get_user_organization_ids() (0018).
--
-- CREATE TABLE IF NOT EXISTS no modifica una tabla que ya existe. Si quedó un
-- stub sin organization_id, el índice o la policy explotan con 42703.
-- Por eso, después de cada CREATE se hace ADD COLUMN IF NOT EXISTS.

set statement_timeout = '30s';
set lock_timeout = '8s';

-- -----------------------------------------------------------------------------
-- 1) Tareas del coordinador
-- -----------------------------------------------------------------------------
create table if not exists public.coordinator_tasks (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  kind             text not null check (kind in ('inbox', 'yellow', 'rematch')),
  source_id        uuid not null,
  title            text not null,
  detail           text not null default '',
  initials         text not null,
  href             text not null,
  status           text not null default 'pending'
    check (status in ('pending', 'in_progress', 'done')),
  due_at           timestamptz not null,
  assignee_id      uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint coordinator_tasks_source_unique unique (organization_id, kind, source_id)
);

alter table public.coordinator_tasks
  add column if not exists organization_id uuid references public.organizations (id) on delete cascade;

create index if not exists coordinator_tasks_org_status_idx
  on public.coordinator_tasks (organization_id, status, due_at);

drop trigger if exists coordinator_tasks_set_updated_at on public.coordinator_tasks;
create trigger coordinator_tasks_set_updated_at
  before update on public.coordinator_tasks
  for each row execute function public.set_updated_at();

alter table public.coordinator_tasks enable row level security;

drop policy if exists coordinator_tasks_select on public.coordinator_tasks;
create policy coordinator_tasks_select
  on public.coordinator_tasks for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists coordinator_tasks_insert on public.coordinator_tasks;
create policy coordinator_tasks_insert
  on public.coordinator_tasks for insert to authenticated
  with check (organization_id in (select public.get_user_organization_ids()));

drop policy if exists coordinator_tasks_update on public.coordinator_tasks;
create policy coordinator_tasks_update
  on public.coordinator_tasks for update to authenticated
  using (organization_id in (select public.get_user_organization_ids()))
  with check (organization_id in (select public.get_user_organization_ids()));

revoke all on table public.coordinator_tasks from anon;
grant select, insert, update on table public.coordinator_tasks to authenticated;

-- -----------------------------------------------------------------------------
-- 2) Avisos in-app (lectura por usuario)
-- -----------------------------------------------------------------------------
create table if not exists public.app_notifications (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  kind             text not null check (kind in ('inbox_new', 'screen_failure', 'task_overdue')),
  title            text not null,
  body             text not null default '',
  href             text not null,
  dedupe_key       text not null,
  created_at       timestamptz not null default now(),
  constraint app_notifications_dedupe unique (organization_id, dedupe_key)
);

alter table public.app_notifications
  add column if not exists organization_id uuid references public.organizations (id) on delete cascade;

create index if not exists app_notifications_org_created_idx
  on public.app_notifications (organization_id, created_at desc);

create table if not exists public.notification_reads (
  notification_id  uuid not null references public.app_notifications (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  read_at          timestamptz not null default now(),
  primary key (notification_id, user_id)
);

alter table public.app_notifications enable row level security;
alter table public.notification_reads enable row level security;

drop policy if exists app_notifications_select on public.app_notifications;
create policy app_notifications_select
  on public.app_notifications for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists app_notifications_insert on public.app_notifications;
create policy app_notifications_insert
  on public.app_notifications for insert to authenticated
  with check (organization_id in (select public.get_user_organization_ids()));

drop policy if exists notification_reads_select on public.notification_reads;
create policy notification_reads_select
  on public.notification_reads for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notification_reads_insert on public.notification_reads;
create policy notification_reads_insert
  on public.notification_reads for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.app_notifications n
      where n.id = notification_id
        and n.organization_id in (select public.get_user_organization_ids())
    )
  );

revoke all on table public.app_notifications from anon;
revoke all on table public.notification_reads from anon;
grant select, insert on table public.app_notifications to authenticated;
grant select, insert on table public.notification_reads to authenticated;

-- -----------------------------------------------------------------------------
-- 3) Agenda de pre-screening
-- -----------------------------------------------------------------------------
create table if not exists public.study_visits (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  patient_id       uuid not null references public.patients (id) on delete cascade,
  protocol_id      uuid references public.protocols (id) on delete set null,
  scheduled_at     timestamptz not null,
  location         text not null default '',
  status           text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes            text not null default '',
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.study_visits
  add column if not exists organization_id uuid references public.organizations (id) on delete cascade;

create index if not exists study_visits_org_when_idx
  on public.study_visits (organization_id, scheduled_at);

drop trigger if exists study_visits_set_updated_at on public.study_visits;
create trigger study_visits_set_updated_at
  before update on public.study_visits
  for each row execute function public.set_updated_at();

alter table public.study_visits enable row level security;

drop policy if exists study_visits_select on public.study_visits;
create policy study_visits_select
  on public.study_visits for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists study_visits_insert on public.study_visits;
create policy study_visits_insert
  on public.study_visits for insert to authenticated
  with check (organization_id in (select public.get_user_organization_ids()));

drop policy if exists study_visits_update on public.study_visits;
create policy study_visits_update
  on public.study_visits for update to authenticated
  using (organization_id in (select public.get_user_organization_ids()))
  with check (organization_id in (select public.get_user_organization_ids()));

revoke all on table public.study_visits from anon;
grant select, insert, update on table public.study_visits to authenticated;

-- -----------------------------------------------------------------------------
-- 6) Bandeja de fallos EHR
-- -----------------------------------------------------------------------------
-- 0015 debió crear ehr_sync_logs con organization_id. Si el CREATE IF NOT EXISTS
-- de 0015 se saltó un stub, aquí no existía la columna y la policy fallaba (42703).

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

alter table public.ehr_sync_logs
  add column if not exists organization_id uuid references public.organizations (id) on delete cascade;

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

alter table public.ehr_sync_logs
  add column if not exists acknowledged_at timestamptz,
  add column if not exists failed_patients jsonb not null default '[]'::jsonb;

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
