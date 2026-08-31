-- =============================================================================
-- EHR integration — Fase 1 (batch sync) + Fase 2 (webhook en tiempo real)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- organizations — configuración EHR por clinical research site
-- -----------------------------------------------------------------------------
alter table public.organizations
  add column if not exists ehr_enabled boolean not null default false,
  add column if not exists ehr_source text,
  add column if not exists ehr_webhook_secret text;

comment on column public.organizations.ehr_enabled is
  'Habilita recepción de webhooks EHR y sync batch para este site.';
comment on column public.organizations.ehr_source is
  'Identificador del sistema EHR (epic, cerner, fhir, custom).';
comment on column public.organizations.ehr_webhook_secret is
  'Secreto HMAC para verificar POST /api/webhooks/ehr.';

-- -----------------------------------------------------------------------------
-- patients — vínculo con paciente externo del EHR
-- -----------------------------------------------------------------------------
alter table public.patients
  add column if not exists ehr_patient_id text,
  add column if not exists ehr_source text,
  add column if not exists ehr_last_synced_at timestamptz;

create unique index if not exists patients_clinic_ehr_id_unique
  on public.patients (clinic_id, ehr_patient_id)
  where ehr_patient_id is not null;

create index if not exists patients_ehr_last_synced_idx
  on public.patients (ehr_last_synced_at desc nulls last);

-- -----------------------------------------------------------------------------
-- ehr_sync_logs — trazabilidad de importaciones batch y webhooks
-- -----------------------------------------------------------------------------
create table if not exists public.ehr_sync_logs (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations (id) on delete cascade,
  sync_type           text not null check (sync_type in ('batch', 'webhook')),
  status              text not null default 'running'
    check (status in ('running', 'completed', 'partial', 'failed')),
  patients_created    integer not null default 0 check (patients_created >= 0),
  patients_updated    integer not null default 0 check (patients_updated >= 0),
  patients_failed     integer not null default 0 check (patients_failed >= 0),
  rematch_refreshed   integer not null default 0 check (rematch_refreshed >= 0),
  payload_summary     jsonb not null default '{}'::jsonb,
  error_details       jsonb not null default '[]'::jsonb,
  triggered_by        uuid references auth.users (id) on delete set null,
  started_at          timestamptz not null default now(),
  completed_at        timestamptz
);

create index if not exists ehr_sync_logs_org_started_idx
  on public.ehr_sync_logs (organization_id, started_at desc);

-- -----------------------------------------------------------------------------
-- ehr_webhook_events — idempotencia Fase 2
-- -----------------------------------------------------------------------------
create table if not exists public.ehr_webhook_events (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  event_id        text not null,
  event_type      text not null,
  processed_at    timestamptz not null default now(),
  sync_log_id     uuid references public.ehr_sync_logs (id) on delete set null,
  constraint ehr_webhook_events_org_event_unique unique (organization_id, event_id)
);

create index if not exists ehr_webhook_events_org_processed_idx
  on public.ehr_webhook_events (organization_id, processed_at desc);

-- -----------------------------------------------------------------------------
-- RLS — logs visibles para miembros autenticados del site
-- -----------------------------------------------------------------------------
alter table public.ehr_sync_logs enable row level security;
alter table public.ehr_webhook_events enable row level security;

drop policy if exists ehr_sync_logs_select on public.ehr_sync_logs;
create policy ehr_sync_logs_select on public.ehr_sync_logs
  for select to authenticated
  using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid()
    )
  );

drop policy if exists ehr_webhook_events_select on public.ehr_webhook_events;
create policy ehr_webhook_events_select on public.ehr_webhook_events
  for select to authenticated
  using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid()
    )
  );
