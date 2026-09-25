-- Visitas de seguimiento del protocolo: calendario (día objetivo + ventana),
-- instancia por sujeto, adherencia, signos vitales, EA y viáticos.
-- Distinto de study_visits (agenda de consultas). No es un EDC CDISC certificado.

set statement_timeout = '60s';
set lock_timeout = '8s';

create table if not exists public.protocol_visit_schedules (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations (id) on delete cascade,
  protocol_id         uuid not null references public.protocols (id) on delete cascade,
  arm_id              uuid references public.protocol_arms (id) on delete cascade,
  visit_code          text not null,
  title               text not null,
  target_day          integer not null,
  window_before_days  integer not null default 2,
  window_after_days   integer not null default 2,
  sort_order          integer not null default 0,
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint protocol_visit_code_not_blank check (length(btrim(visit_code)) > 0),
  constraint protocol_visit_title_not_blank check (length(btrim(title)) > 0),
  constraint protocol_visit_target_day_ck check (target_day >= 0 and target_day <= 3650),
  constraint protocol_visit_window_before_ck check (window_before_days >= 0 and window_before_days <= 30),
  constraint protocol_visit_window_after_ck check (window_after_days >= 0 and window_after_days <= 30)
);

comment on table public.protocol_visit_schedules is
  'Calendario del protocolo. Día 0 = randomización/primera dosis. Ventana −N/+M. arm_id nulo = todos los brazos.';

create unique index if not exists protocol_visit_schedules_all_arms_uidx
  on public.protocol_visit_schedules (protocol_id, visit_code)
  where arm_id is null;

create unique index if not exists protocol_visit_schedules_arm_uidx
  on public.protocol_visit_schedules (protocol_id, arm_id, visit_code)
  where arm_id is not null;

create index if not exists protocol_visit_schedules_protocol_idx
  on public.protocol_visit_schedules (protocol_id, sort_order, target_day);

drop trigger if exists protocol_visit_schedules_set_updated_at on public.protocol_visit_schedules;
create trigger protocol_visit_schedules_set_updated_at
  before update on public.protocol_visit_schedules
  for each row execute function public.set_updated_at();

create table if not exists public.follow_up_visits (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations (id) on delete cascade,
  patient_id             uuid not null references public.patients (id) on delete cascade,
  protocol_id            uuid not null references public.protocols (id) on delete restrict,
  arm_id                 uuid references public.protocol_arms (id) on delete set null,
  schedule_id            uuid not null references public.protocol_visit_schedules (id) on delete restrict,
  study_visit_id         uuid references public.study_visits (id) on delete set null,
  baseline_on            date not null,
  target_on              date not null,
  window_start_on        date not null,
  window_end_on          date not null,
  scheduled_on           date not null,
  actual_on              date,
  status                 text not null default 'scheduled',
  protocol_deviation     boolean not null default false,
  pills_dispensed        integer,
  pills_returned         integer,
  adherence_pct          numeric(5,1),
  systolic               integer,
  diastolic              integer,
  heart_rate             integer,
  temperature            numeric(4,1),
  weight_kg              numeric(6,2),
  adverse_event          boolean not null default false,
  adverse_event_notes    text not null default '',
  transport_amount       numeric(12,2) not null default 0,
  meals_amount           numeric(12,2) not null default 0,
  currency               text not null default 'ARS',
  notes                  text not null default '',
  completed_by           uuid references auth.users (id) on delete set null,
  completed_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint follow_up_status_ck check (
    status in ('scheduled', 'completed', 'out_of_window', 'missed')
  ),
  constraint follow_up_window_order_ck check (window_start_on <= target_on and target_on <= window_end_on),
  constraint follow_up_pills_ck check (
    pills_dispensed is null
    or (pills_dispensed >= 0 and pills_returned is not null and pills_returned >= 0 and pills_returned <= pills_dispensed)
  ),
  constraint follow_up_vitals_range_ck check (
    (systolic is null or (systolic between 60 and 260))
    and (diastolic is null or (diastolic between 30 and 160))
    and (heart_rate is null or (heart_rate between 20 and 250))
    and (temperature is null or (temperature between 32 and 43))
    and (weight_kg is null or (weight_kg between 1 and 400))
  ),
  constraint follow_up_money_ck check (transport_amount >= 0 and meals_amount >= 0),
  constraint follow_up_currency_ck check (currency in ('ARS', 'USD', 'MXN', 'CLP', 'COP', 'EUR', 'BRL')),
  constraint follow_up_ae_notes_ck check (
    adverse_event = false or length(btrim(adverse_event_notes)) > 0
  ),
  constraint follow_up_complete_vitals_ck check (
    status in ('scheduled', 'missed')
    or (systolic is not null and diastolic is not null and heart_rate is not null)
  ),
  constraint follow_up_visits_unique unique (patient_id, schedule_id)
);

comment on table public.follow_up_visits is
  'Instancia de visita de seguimiento. Ventana copiada al generar. Desviación si actual_on queda fuera.';

comment on column public.follow_up_visits.protocol_deviation is
  'true si la fecha real está fuera de ventana o la visita se marcó perdida.';

comment on column public.follow_up_visits.adherence_pct is
  '(pastillas entregadas − devueltas) / entregadas × 100.';

create index if not exists follow_up_visits_org_window_idx
  on public.follow_up_visits (organization_id, window_end_on, status);

create index if not exists follow_up_visits_patient_idx
  on public.follow_up_visits (patient_id, target_on);

drop trigger if exists follow_up_visits_set_updated_at on public.follow_up_visits;
create trigger follow_up_visits_set_updated_at
  before update on public.follow_up_visits
  for each row execute function public.set_updated_at();

create or replace function public.follow_up_apply_window()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'missed' then
    new.protocol_deviation := true;
    return new;
  end if;

  if new.actual_on is not null and new.status in ('completed', 'out_of_window', 'scheduled') then
    if new.actual_on < new.window_start_on or new.actual_on > new.window_end_on then
      new.protocol_deviation := true;
      new.status := 'out_of_window';
    else
      new.protocol_deviation := false;
      new.status := 'completed';
    end if;
  end if;

  if new.pills_dispensed is not null and new.pills_dispensed > 0 and new.pills_returned is not null then
    new.adherence_pct := round(
      ((new.pills_dispensed - new.pills_returned)::numeric / new.pills_dispensed) * 100,
      1
    );
  else
    new.adherence_pct := null;
  end if;

  return new;
end;
$$;

drop trigger if exists follow_up_visits_apply_window on public.follow_up_visits;
create trigger follow_up_visits_apply_window
  before insert or update on public.follow_up_visits
  for each row execute function public.follow_up_apply_window();

alter table public.protocol_visit_schedules enable row level security;
alter table public.follow_up_visits enable row level security;

drop policy if exists protocol_visit_schedules_select on public.protocol_visit_schedules;
create policy protocol_visit_schedules_select
  on public.protocol_visit_schedules for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists protocol_visit_schedules_write on public.protocol_visit_schedules;
create policy protocol_visit_schedules_write
  on public.protocol_visit_schedules for all to authenticated
  using (
    public.can_write_clinical_data()
    and organization_id in (select public.get_user_organization_ids())
  )
  with check (
    public.can_write_clinical_data()
    and organization_id in (select public.get_user_organization_ids())
  );

drop policy if exists follow_up_visits_select on public.follow_up_visits;
create policy follow_up_visits_select
  on public.follow_up_visits for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists follow_up_visits_insert on public.follow_up_visits;
create policy follow_up_visits_insert
  on public.follow_up_visits for insert to authenticated
  with check (
    public.can_write_clinical_data()
    and organization_id in (select public.get_user_organization_ids())
  );

drop policy if exists follow_up_visits_update on public.follow_up_visits;
create policy follow_up_visits_update
  on public.follow_up_visits for update to authenticated
  using (
    public.can_write_clinical_data()
    and organization_id in (select public.get_user_organization_ids())
  )
  with check (
    public.can_write_clinical_data()
    and organization_id in (select public.get_user_organization_ids())
  );

revoke all on table public.protocol_visit_schedules from anon, public;
revoke all on table public.follow_up_visits from anon, public;

grant select, insert, update on table public.protocol_visit_schedules to authenticated;
grant select, insert, update on table public.follow_up_visits to authenticated;

notify pgrst, 'reload schema';
