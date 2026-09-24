-- Repara el esquema de operaciones que la app ya consulta:
--   * public.app_notifications (PGRST205: no está en el schema cache)
--   * public.study_visits.location (42703: la columna no existe)
--
-- Causa: CREATE TABLE IF NOT EXISTS en 0019 no altera un stub previo.
-- 0019 solo hacía ADD COLUMN organization_id. FHIR y visit-notes agregaron
-- otras columnas, pero location nunca se creó.
--
-- Idempotente. Pegar en SQL Editor de Supabase si `db push` no corrió.

set statement_timeout = '30s';
set lock_timeout = '8s';

-- -----------------------------------------------------------------------------
-- Avisos
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
  add column if not exists organization_id uuid references public.organizations (id) on delete cascade,
  add column if not exists kind text,
  add column if not exists title text,
  add column if not exists body text not null default '',
  add column if not exists href text,
  add column if not exists dedupe_key text,
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.notification_reads (
  notification_id  uuid not null references public.app_notifications (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  read_at          timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create unique index if not exists app_notifications_dedupe
  on public.app_notifications (organization_id, dedupe_key);

create index if not exists app_notifications_org_created_idx
  on public.app_notifications (organization_id, created_at desc);

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
-- Tareas del coordinador (la cola las lee junto con los avisos)
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
  add column if not exists organization_id uuid references public.organizations (id) on delete cascade,
  add column if not exists kind text,
  add column if not exists source_id uuid,
  add column if not exists title text,
  add column if not exists detail text not null default '',
  add column if not exists initials text,
  add column if not exists href text,
  add column if not exists status text not null default 'pending',
  add column if not exists due_at timestamptz not null default now(),
  add column if not exists assignee_id uuid references auth.users (id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists coordinator_tasks_source_unique
  on public.coordinator_tasks (organization_id, kind, source_id);

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
-- Visitas: location y el resto de columnas que la API selecciona
-- -----------------------------------------------------------------------------
create table if not exists public.study_visits (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  patient_id       uuid not null references public.patients (id) on delete cascade,
  protocol_id      uuid references public.protocols (id) on delete set null,
  scheduled_at     timestamptz not null default now(),
  location         text not null default '',
  status           text not null default 'scheduled',
  notes            text not null default '',
  kind             text not null default 'consulta',
  clinician_name   text not null default '',
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.study_visits
  add column if not exists organization_id uuid references public.organizations (id) on delete cascade,
  add column if not exists patient_id uuid references public.patients (id) on delete cascade,
  add column if not exists protocol_id uuid references public.protocols (id) on delete set null,
  add column if not exists scheduled_at timestamptz not null default now(),
  add column if not exists location text not null default '',
  add column if not exists status text not null default 'scheduled',
  add column if not exists notes text not null default '',
  add column if not exists kind text not null default 'consulta',
  add column if not exists clinician_name text not null default '',
  add column if not exists created_by uuid references auth.users (id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.study_visits
  drop constraint if exists study_visits_status_check;
alter table public.study_visits
  add constraint study_visits_status_check
  check (status in ('scheduled', 'completed', 'cancelled', 'no_show'));

alter table public.study_visits
  drop constraint if exists study_visits_kind_check;
alter table public.study_visits
  add constraint study_visits_kind_check
  check (kind in ('consulta', 'pre_screening', 'screening', 'follow_up'));

create index if not exists study_visits_org_when_idx
  on public.study_visits (organization_id, scheduled_at);
create index if not exists study_visits_patient_when_idx
  on public.study_visits (patient_id, scheduled_at desc);

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

comment on table public.study_visits is
  'Control de visitas del paciente con el médico. Fecha, sede, tipo, estado y notas.';
comment on column public.study_visits.location is
  'Sede o consultorio de la visita.';

-- PostgREST cache (si no recarga solo: Dashboard → Settings → API → Reload)
notify pgrst, 'reload schema';
