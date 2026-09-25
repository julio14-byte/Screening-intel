-- Dispensación de caja IWRS, primera dosis en clínica y diario de toma.
-- El diario vive en Crisvia (ruta pública /diario), no en una app aparte.

set statement_timeout = '60s';
set lock_timeout = '8s';

alter table public.prescriptions
  add column if not exists kit_code text not null default '';

alter table public.prescriptions
  add column if not exists first_dose_at timestamptz;

alter table public.prescriptions
  add column if not exists first_dose_mode text;

alter table public.prescriptions
  drop constraint if exists prescriptions_first_dose_mode_check;
alter table public.prescriptions
  add constraint prescriptions_first_dose_mode_check
  check (first_dose_mode is null or first_dose_mode in ('clinic', 'home'));

alter table public.prescriptions
  add column if not exists first_dose_by uuid references auth.users (id) on delete set null;

alter table public.prescriptions
  add column if not exists first_dose_notes text not null default '';

comment on column public.prescriptions.kit_code is
  'Caja IWRS que el farmacéutico del site debe entregar. Distinto del lote de la farmacéutica.';
comment on column public.prescriptions.first_dose_mode is
  'clinic: primera dosis vista en el centro. home: oral para llevar, con indicaciones.';

create table if not exists public.dosing_diary_entries (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  patient_id       uuid not null references public.patients (id) on delete cascade,
  protocol_id      uuid not null references public.protocols (id) on delete cascade,
  prescription_id  uuid references public.prescriptions (id) on delete set null,
  diary_on         date not null,
  taken_at         timestamptz,
  taken            boolean not null default true,
  symptoms         text not null default '',
  severity         integer not null default 0
    check (severity between 0 and 10),
  source           text not null default 'patient'
    check (source in ('patient', 'staff')),
  created_at       timestamptz not null default now(),
  constraint dosing_diary_symptoms_len check (length(symptoms) <= 500),
  constraint dosing_diary_day_unique unique (patient_id, protocol_id, diary_on)
);

comment on table public.dosing_diary_entries is
  'Diario de toma: una fila por día y protocolo. Lo carga el paciente en /diario o el coordinador.';

create index if not exists dosing_diary_entries_org_day_idx
  on public.dosing_diary_entries (organization_id, diary_on desc);

create index if not exists dosing_diary_entries_patient_idx
  on public.dosing_diary_entries (patient_id, protocol_id, diary_on desc);

create table if not exists public.dosing_diary_links (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  patient_id       uuid not null references public.patients (id) on delete cascade,
  protocol_id      uuid not null references public.protocols (id) on delete cascade,
  token_hash       text not null,
  expires_at       timestamptz not null,
  revoked_at       timestamptz,
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  constraint dosing_diary_links_hash_len check (length(token_hash) = 64)
);

comment on table public.dosing_diary_links is
  'Link mágico del diario. Se guarda el SHA-256 del token, nunca el token en claro.';

create unique index if not exists dosing_diary_links_hash_uidx
  on public.dosing_diary_links (token_hash);

create index if not exists dosing_diary_links_patient_idx
  on public.dosing_diary_links (patient_id, protocol_id, created_at desc);

alter table public.dosing_diary_entries enable row level security;
alter table public.dosing_diary_links enable row level security;

drop policy if exists dosing_diary_entries_select on public.dosing_diary_entries;
create policy dosing_diary_entries_select
  on public.dosing_diary_entries for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists dosing_diary_entries_write on public.dosing_diary_entries;
create policy dosing_diary_entries_write
  on public.dosing_diary_entries for insert to authenticated
  with check (
    public.can_write_clinical_data()
    and organization_id in (select public.get_user_organization_ids())
  );

drop policy if exists dosing_diary_entries_update on public.dosing_diary_entries;
create policy dosing_diary_entries_update
  on public.dosing_diary_entries for update to authenticated
  using (
    public.can_write_clinical_data()
    and organization_id in (select public.get_user_organization_ids())
  )
  with check (
    public.can_write_clinical_data()
    and organization_id in (select public.get_user_organization_ids())
  );

drop policy if exists dosing_diary_links_select on public.dosing_diary_links;
create policy dosing_diary_links_select
  on public.dosing_diary_links for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists dosing_diary_links_insert on public.dosing_diary_links;
create policy dosing_diary_links_insert
  on public.dosing_diary_links for insert to authenticated
  with check (
    public.can_write_clinical_data()
    and organization_id in (select public.get_user_organization_ids())
  );

drop policy if exists dosing_diary_links_update on public.dosing_diary_links;
create policy dosing_diary_links_update
  on public.dosing_diary_links for update to authenticated
  using (
    public.can_write_clinical_data()
    and organization_id in (select public.get_user_organization_ids())
  )
  with check (
    public.can_write_clinical_data()
    and organization_id in (select public.get_user_organization_ids())
  );

revoke all on table public.dosing_diary_entries from anon, public;
revoke all on table public.dosing_diary_links from anon, public;
grant select, insert, update on table public.dosing_diary_entries to authenticated;
grant select, insert, update on table public.dosing_diary_links to authenticated;

notify pgrst, 'reload schema';
