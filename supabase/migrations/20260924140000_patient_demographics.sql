-- Datos demográficos y básicos del Patient.
-- Nombre y contacto quedan en el expediente (PHI). El estudio usa subject_code numérico.

set statement_timeout = '30s';
set lock_timeout = '8s';

alter table public.patients
  add column if not exists subject_code text,
  add column if not exists ethnicity text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists address_line text,
  add column if not exists address_city text,
  add column if not exists address_state text,
  add column if not exists address_postal_code text,
  add column if not exists address_country text not null default 'MX';

comment on column public.patients.subject_code is
  'Identificador numérico del sujeto en el estudio. Disocia nombre y contacto del protocolo.';
comment on column public.patients.ethnicity is
  'Etnia autodeclarada o registrada por el coordinador. Farmacología y criterios de algunos protocolos.';
comment on column public.patients.phone is
  'Teléfono de contacto. PHI: no se usa como identificador del estudio.';
comment on column public.patients.email is
  'Correo de contacto. PHI: no se usa como identificador del estudio.';

alter table public.patients
  drop constraint if exists patients_subject_code_numeric;
alter table public.patients
  add constraint patients_subject_code_numeric
  check (
    subject_code is null
    or subject_code ~ '^[0-9]{4,12}$'
  );

alter table public.patients
  drop constraint if exists patients_ethnicity_known;
alter table public.patients
  add constraint patients_ethnicity_known
  check (
    ethnicity is null
    or ethnicity in (
      'mestizo',
      'blanco',
      'indigena',
      'afrodescendiente',
      'asiatico',
      'otro',
      'no_informa'
    )
  );

create unique index if not exists patients_clinic_subject_code_uidx
  on public.patients (clinic_id, subject_code)
  where subject_code is not null and length(btrim(subject_code)) > 0;

create or replace function public.assign_patient_subject_code()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  next_n bigint;
begin
  if new.subject_code is not null and length(btrim(new.subject_code)) > 0 then
    new.subject_code := btrim(new.subject_code);
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext(coalesce(new.clinic_id::text, '')));

  select coalesce(max(p.subject_code::bigint), 10000) + 1
    into next_n
  from public.patients p
  where p.clinic_id = new.clinic_id
    and p.subject_code ~ '^[0-9]+$';

  new.subject_code := next_n::text;
  return new;
end;
$$;

drop trigger if exists patients_assign_subject_code on public.patients;
create trigger patients_assign_subject_code
  before insert on public.patients
  for each row execute function public.assign_patient_subject_code();

with numbered as (
  select
    id,
    clinic_id,
    row_number() over (partition by clinic_id order by created_at, id) as n
  from public.patients
  where subject_code is null or btrim(subject_code) = ''
),
max_existing as (
  select
    clinic_id,
    coalesce(max(subject_code::bigint), 10000) as last
  from public.patients
  where subject_code ~ '^[0-9]+$'
  group by clinic_id
)
update public.patients p
set subject_code = (
  coalesce(max_existing.last, 10000) + numbered.n
)::text
from numbered
left join max_existing on max_existing.clinic_id = numbered.clinic_id
where p.id = numbered.id;

notify pgrst, 'reload schema';
