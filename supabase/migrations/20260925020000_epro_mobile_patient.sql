-- ePRO móvil del sujeto: invitación del coordinador, PIN y respuestas diarias.
-- Cuestionarios = epro_forms; preguntas = epro_forms.questions (vista epro_questions);
-- respuestas diarias = epro_daily_answers. No reutiliza epro_responses (única por formulario).

set statement_timeout = '60s';
set lock_timeout = '8s';

alter table public.epro_forms
  add column if not exists cadence text not null default 'visit';

alter table public.epro_forms
  drop constraint if exists epro_forms_cadence_check;
alter table public.epro_forms
  add constraint epro_forms_cadence_check
  check (cadence in ('visit', 'daily'));

comment on column public.epro_forms.cadence is
  'visit: cuestionario de visita (staff). daily: ePRO móvil, una respuesta por día UTC.';

update public.epro_forms
set cadence = 'daily'
where id = '33333333-3333-3333-3333-333333333301';

create or replace view public.epro_questions
with (security_invoker = true) as
select
  f.id as form_id,
  coalesce(q.elem->>'id', q.ord::text) as id,
  (q.ord - 1)::integer as sort_order,
  q.elem->>'type' as type,
  q.elem->>'label' as label,
  nullif(q.elem->>'min', '')::integer as min_value,
  nullif(q.elem->>'max', '')::integer as max_value
from public.epro_forms f
cross join lateral jsonb_array_elements(coalesce(f.questions, '[]'::jsonb))
  with ordinality as q(elem, ord);

comment on view public.epro_questions is
  'Preguntas del cuestionario ePRO (proyección de epro_forms.questions).';

create table if not exists public.epro_activation_invites (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  patient_id       uuid not null references public.patients (id) on delete cascade,
  token_hash       text not null,
  expires_at       timestamptz not null,
  used_at          timestamptz,
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  constraint epro_activation_hash_len check (length(token_hash) = 64)
);

comment on table public.epro_activation_invites is
  'Invitación de un solo uso (48 h). El coordinador la genera desde el EDC. Se guarda el SHA-256, nunca el token.';

create unique index if not exists epro_activation_invites_hash_uidx
  on public.epro_activation_invites (token_hash);

create index if not exists epro_activation_invites_patient_idx
  on public.epro_activation_invites (patient_id, created_at desc);

create table if not exists public.epro_patient_pins (
  patient_id       uuid primary key references public.patients (id) on delete cascade,
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  pin_hash         text not null,
  failed_attempts  integer not null default 0,
  locked_until     timestamptz,
  activated_at     timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.epro_patient_pins is
  'PIN de 6 dígitos (scrypt). El sujeto no es un usuario de Auth.';

create table if not exists public.epro_patient_sessions (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  patient_id       uuid not null references public.patients (id) on delete cascade,
  token_hash       text not null,
  expires_at       timestamptz not null,
  last_seen_at     timestamptz not null default now(),
  revoked_at       timestamptz,
  created_at       timestamptz not null default now(),
  constraint epro_session_hash_len check (length(token_hash) = 64)
);

comment on table public.epro_patient_sessions is
  'Sesión ePRO móvil. Idle 3 minutos; el token se guarda hasheado.';

create unique index if not exists epro_patient_sessions_hash_uidx
  on public.epro_patient_sessions (token_hash);

create index if not exists epro_patient_sessions_patient_idx
  on public.epro_patient_sessions (patient_id, last_seen_at desc);

create table if not exists public.epro_daily_answers (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  patient_id       uuid not null references public.patients (id) on delete cascade,
  form_id          uuid not null references public.epro_forms (id) on delete restrict,
  answered_on      date not null,
  answers          jsonb not null default '{}'::jsonb,
  submitted_at     timestamptz not null default timezone('utc', now()),
  constraint epro_daily_answers_unique unique (patient_id, form_id, answered_on)
);

comment on table public.epro_daily_answers is
  'Respuestas_Paciente del ePRO diario. submitted_at UTC inmutable (sin UPDATE/DELETE).';

create index if not exists epro_daily_answers_org_day_idx
  on public.epro_daily_answers (organization_id, answered_on desc);

create or replace function public.epro_daily_answers_immutable()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Las respuestas ePRO diarias no se modifican ni se borran (bitácora / 21 CFR Part 11).';
end;
$$;

drop trigger if exists epro_daily_answers_no_update on public.epro_daily_answers;
create trigger epro_daily_answers_no_update
  before update or delete on public.epro_daily_answers
  for each row execute function public.epro_daily_answers_immutable();

alter table public.epro_activation_invites enable row level security;
alter table public.epro_patient_pins enable row level security;
alter table public.epro_patient_sessions enable row level security;
alter table public.epro_daily_answers enable row level security;

drop policy if exists epro_activation_invites_select on public.epro_activation_invites;
create policy epro_activation_invites_select
  on public.epro_activation_invites for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists epro_activation_invites_insert on public.epro_activation_invites;
create policy epro_activation_invites_insert
  on public.epro_activation_invites for insert to authenticated
  with check (
    public.can_write_clinical_data()
    and organization_id in (select public.get_user_organization_ids())
  );

drop policy if exists epro_activation_invites_update on public.epro_activation_invites;
create policy epro_activation_invites_update
  on public.epro_activation_invites for update to authenticated
  using (
    public.can_write_clinical_data()
    and organization_id in (select public.get_user_organization_ids())
  )
  with check (
    public.can_write_clinical_data()
    and organization_id in (select public.get_user_organization_ids())
  );

drop policy if exists epro_patient_pins_select on public.epro_patient_pins;

drop policy if exists epro_daily_answers_select on public.epro_daily_answers;
create policy epro_daily_answers_select
  on public.epro_daily_answers for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

-- PIN y sesiones: el sujeto accede vía service role en /api/epro-app/p. Staff no lee el hash del PIN.
revoke all on table public.epro_activation_invites from anon, public;
revoke all on table public.epro_patient_pins from anon, public, authenticated;
revoke all on table public.epro_patient_sessions from anon, public, authenticated;
revoke all on table public.epro_daily_answers from anon, public;
revoke all on table public.epro_questions from anon, public;

grant select, insert, update on table public.epro_activation_invites to authenticated;
grant select on table public.epro_daily_answers to authenticated;
grant select on table public.epro_questions to authenticated;

create or replace function public.epro_activation_status(p_patient_id uuid)
returns table (activated_at timestamptz, locked boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.activated_at,
    (p.locked_until is not null and p.locked_until > now()) as locked
  from public.epro_patient_pins p
  where p.patient_id = p_patient_id
    and p.organization_id in (select public.get_user_organization_ids());
$$;

comment on function public.epro_activation_status(uuid) is
  'Estado de activación ePRO para el staff del centro. No expone pin_hash.';

revoke all on function public.epro_activation_status(uuid) from anon, public;
grant execute on function public.epro_activation_status(uuid) to authenticated;

notify pgrst, 'reload schema';
