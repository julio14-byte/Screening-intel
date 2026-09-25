-- Conexión de Screening (Crisvia) a EDC, ePRO e IWRS de terceros.
-- Webhook HTTPS + HMAC. No es un conector Lilly/Medidata/IQVIA certificado.

set statement_timeout = '60s';
set lock_timeout = '8s';

create table if not exists public.protocol_integrations (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations (id) on delete cascade,
  protocol_id        uuid not null references public.protocols (id) on delete cascade,
  kind               text not null,
  vendor             text not null default '',
  endpoint_url       text not null default '',
  signing_secret     text not null,
  active             boolean not null default true,
  last_error         text not null default '',
  last_delivered_at  timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint protocol_integrations_kind_ck check (kind in ('edc', 'epro', 'iwrs')),
  constraint protocol_integrations_secret_ck check (length(signing_secret) >= 16),
  constraint protocol_integrations_vendor_ck check (length(btrim(vendor)) > 0),
  constraint protocol_integrations_unique unique (protocol_id, kind)
);

comment on table public.protocol_integrations is
  'Endpoint HTTPS del EDC, ePRO o IWRS del estudio. Crisvia no opera esos módulos; dispara eventos de screening.';

comment on column public.protocol_integrations.signing_secret is
  'Secreto HMAC-SHA256. Nunca se lista en GET; solo se muestra al crear.';

create index if not exists protocol_integrations_org_idx
  on public.protocol_integrations (organization_id, kind, active);

drop trigger if exists protocol_integrations_set_updated_at on public.protocol_integrations;
create trigger protocol_integrations_set_updated_at
  before update on public.protocol_integrations
  for each row execute function public.set_updated_at();

create table if not exists public.integration_deliveries (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations (id) on delete cascade,
  integration_id     uuid not null references public.protocol_integrations (id) on delete cascade,
  protocol_id        uuid not null references public.protocols (id) on delete cascade,
  screening_id       uuid references public.screenings (id) on delete set null,
  event_type         text not null,
  direction          text not null default 'outbound',
  payload            jsonb not null default '{}'::jsonb,
  http_status        integer,
  error              text not null default '',
  created_at         timestamptz not null default now(),
  constraint integration_deliveries_direction_ck check (direction in ('outbound', 'inbound')),
  constraint integration_deliveries_event_ck check (length(btrim(event_type)) > 0)
);

comment on table public.integration_deliveries is
  'Bitácora de webhooks. Outbound = Crisvia → tercero. Inbound = IWRS/EDC/ePRO → Crisvia.';

create index if not exists integration_deliveries_org_idx
  on public.integration_deliveries (organization_id, created_at desc);

create table if not exists public.screening_external_ids (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations (id) on delete cascade,
  screening_id       uuid not null references public.screenings (id) on delete cascade,
  kind               text not null,
  external_id        text not null,
  kit_code           text not null default '',
  created_at         timestamptz not null default now(),
  constraint screening_external_ids_kind_ck check (kind in ('edc', 'epro', 'iwrs')),
  constraint screening_external_ids_unique unique (screening_id, kind)
);

comment on table public.screening_external_ids is
  'Identificador que devolvió el EDC, ePRO o IWRS del tercero para este screening.';

alter table public.protocol_integrations enable row level security;
alter table public.integration_deliveries enable row level security;
alter table public.screening_external_ids enable row level security;

drop policy if exists protocol_integrations_select on public.protocol_integrations;
create policy protocol_integrations_select
  on public.protocol_integrations for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists protocol_integrations_write on public.protocol_integrations;
create policy protocol_integrations_write
  on public.protocol_integrations for all to authenticated
  using (
    public.can_write_clinical_data()
    and organization_id in (select public.get_user_organization_ids())
  )
  with check (
    public.can_write_clinical_data()
    and organization_id in (select public.get_user_organization_ids())
  );

drop policy if exists integration_deliveries_select on public.integration_deliveries;
create policy integration_deliveries_select
  on public.integration_deliveries for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists integration_deliveries_insert on public.integration_deliveries;
create policy integration_deliveries_insert
  on public.integration_deliveries for insert to authenticated
  with check (
    public.can_write_clinical_data()
    and organization_id in (select public.get_user_organization_ids())
  );

drop policy if exists screening_external_ids_select on public.screening_external_ids;
create policy screening_external_ids_select
  on public.screening_external_ids for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists screening_external_ids_write on public.screening_external_ids;
create policy screening_external_ids_write
  on public.screening_external_ids for all to authenticated
  using (
    public.can_write_clinical_data()
    and organization_id in (select public.get_user_organization_ids())
  )
  with check (
    public.can_write_clinical_data()
    and organization_id in (select public.get_user_organization_ids())
  );

revoke all on table public.protocol_integrations from anon, public;
revoke all on table public.integration_deliveries from anon, public;
revoke all on table public.screening_external_ids from anon, public;

grant select, insert, update on table public.protocol_integrations to authenticated;
grant select, insert on table public.integration_deliveries to authenticated;
grant select, insert, update on table public.screening_external_ids to authenticated;

-- El secreto HMAC no se lista por PostgREST; el dispatch lo lee con service role.
revoke select (signing_secret) on table public.protocol_integrations from authenticated;

notify pgrst, 'reload schema';
