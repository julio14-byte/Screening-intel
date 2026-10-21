-- Motivo de screen failure y consentimiento para reutilizar el expediente
-- en otro protocolo del mismo sitio.
-- El sitio registra que el paciente autorizó esa búsqueda. No es el ICF del patrocinador
-- ni una certificación. Requiere get_user_organization_ids(), can_write_clinical_data()
-- y audit.capture_row_change().

alter table public.screenings
  add column if not exists failure_reason text,
  add column if not exists failure_recorded_at timestamptz,
  add column if not exists failure_recorded_by uuid references auth.users (id) on delete set null;

alter table public.screenings
  drop constraint if exists screenings_failure_reason_len;

alter table public.screenings
  add constraint screenings_failure_reason_len
  check (
    failure_reason is null
    or char_length(btrim(failure_reason)) between 8 and 500
  );

comment on column public.screenings.failure_reason is
  'Motivo del screen failure, escrito por el equipo del sitio.';

-- -----------------------------------------------------------------------------
-- Consentimiento de reutilización (propósito limitado al re-match del sitio)
-- -----------------------------------------------------------------------------
create table if not exists public.patient_reuse_consents (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  patient_id       uuid not null references public.patients (id) on delete cascade,
  status           text not null default 'active'
    check (status in ('active', 'revoked')),
  basis            text not null
    check (basis in ('written', 'verbal_documented')),
  purpose          text not null
    check (char_length(btrim(purpose)) between 8 and 300),
  note             text not null default ''
    check (char_length(note) <= 500),
  consented_on     date not null default current_date,
  expires_on       date,
  authorized_by    uuid references auth.users (id) on delete set null,
  revoked_at       timestamptz,
  revoked_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  constraint patient_reuse_consents_period check (
    expires_on is null or expires_on >= consented_on
  )
);

create unique index if not exists patient_reuse_consents_one_active_idx
  on public.patient_reuse_consents (patient_id)
  where status = 'active';

create index if not exists patient_reuse_consents_org_idx
  on public.patient_reuse_consents (organization_id, patient_id);

alter table public.patient_reuse_consents enable row level security;

drop policy if exists patient_reuse_consents_select on public.patient_reuse_consents;
create policy patient_reuse_consents_select
  on public.patient_reuse_consents for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists patient_reuse_consents_insert on public.patient_reuse_consents;
create policy patient_reuse_consents_insert
  on public.patient_reuse_consents for insert to authenticated
  with check (
    public.can_write_clinical_data()
    and organization_id in (select public.get_user_organization_ids())
  );

drop policy if exists patient_reuse_consents_update on public.patient_reuse_consents;
create policy patient_reuse_consents_update
  on public.patient_reuse_consents for update to authenticated
  using (
    public.can_write_clinical_data()
    and organization_id in (select public.get_user_organization_ids())
  )
  with check (
    public.can_write_clinical_data()
    and organization_id in (select public.get_user_organization_ids())
  );

revoke all on table public.patient_reuse_consents from anon, authenticated;
grant select (
  id, organization_id, patient_id, status, basis, purpose, note,
  consented_on, expires_on, authorized_by, revoked_at, revoked_by, created_at
) on public.patient_reuse_consents to authenticated;
grant insert (
  organization_id, patient_id, basis, purpose, note, consented_on, expires_on
) on public.patient_reuse_consents to authenticated;
grant update (status) on public.patient_reuse_consents to authenticated;

-- -----------------------------------------------------------------------------
-- El actor y la organización no los elige el cliente
-- -----------------------------------------------------------------------------
create or replace function public.guard_patient_reuse_consent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Se requiere sesión para registrar el consentimiento.';
  end if;
  if not public.can_write_clinical_data() then
    raise exception 'Tu rol no puede autorizar la reutilización del expediente.';
  end if;

  if tg_op = 'INSERT' then
    if not exists (
      select 1
      from public.patients p
      where p.id = new.patient_id
        and p.clinic_id = new.organization_id
        and p.clinic_id in (select public.get_user_organization_ids())
    ) then
      raise exception 'El paciente no pertenece a tu organización.';
    end if;
    new.status := 'active';
    new.authorized_by := auth.uid();
    new.revoked_at := null;
    new.revoked_by := null;
    return new;
  end if;

  if old.status = 'revoked' then
    raise exception 'Un consentimiento revocado no se edita.';
  end if;
  if new.status <> 'revoked' then
    raise exception 'Solo se puede revocar este consentimiento. Para cambiarlo, revócalo y registra uno nuevo.';
  end if;

  new.organization_id := old.organization_id;
  new.patient_id := old.patient_id;
  new.basis := old.basis;
  new.purpose := old.purpose;
  new.note := old.note;
  new.consented_on := old.consented_on;
  new.expires_on := old.expires_on;
  new.authorized_by := old.authorized_by;
  new.created_at := old.created_at;
  new.revoked_at := now();
  new.revoked_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists patient_reuse_consents_guard on public.patient_reuse_consents;
create trigger patient_reuse_consents_guard
  before insert or update on public.patient_reuse_consents
  for each row execute function public.guard_patient_reuse_consent();

revoke all on function public.guard_patient_reuse_consent() from public, anon, authenticated;

drop trigger if exists patient_reuse_consents_audit_trail on public.patient_reuse_consents;
create trigger patient_reuse_consents_audit_trail
  after update or delete on public.patient_reuse_consents
  for each row execute function audit.capture_row_change();

-- -----------------------------------------------------------------------------
-- Screen failure con motivo, y re-match solo con consentimiento vigente
-- -----------------------------------------------------------------------------
create or replace function public.guard_screening_failure_reuse()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entering_failure boolean;
begin
  v_entering_failure :=
    new.status = 'screen_failure'::public.screening_status
    and (tg_op = 'INSERT' or old.status is distinct from new.status);

  if auth.uid() is not null and v_entering_failure then
    if new.failure_reason is null
       or char_length(btrim(new.failure_reason)) < 8 then
      raise exception 'Registra el motivo del screen failure (al menos 8 caracteres).';
    end if;
    new.failure_recorded_at := now();
    new.failure_recorded_by := auth.uid();
  end if;

  if auth.uid() is not null
     and tg_op = 'UPDATE'
     and new.status = 'screen_failure'::public.screening_status
     and new.failure_reason is distinct from old.failure_reason then
    if new.failure_reason is null
       or char_length(btrim(new.failure_reason)) < 8 then
      raise exception 'Registra el motivo del screen failure (al menos 8 caracteres).';
    end if;
    new.failure_recorded_at := now();
    new.failure_recorded_by := auth.uid();
  end if;

  if auth.uid() is not null
     and tg_op = 'INSERT'
     and exists (
       select 1
       from public.screenings s
       where s.patient_id = new.patient_id
         and s.protocol_id <> new.protocol_id
         and s.status = 'screen_failure'::public.screening_status
     )
     and not exists (
       select 1
       from public.patient_reuse_consents c
       where c.patient_id = new.patient_id
         and c.status = 'active'
         and (c.expires_on is null or c.expires_on >= current_date)
     ) then
    raise exception 'Se requiere un consentimiento vigente para reutilizar el expediente en otro protocolo.';
  end if;

  return new;
end;
$$;

drop trigger if exists screenings_failure_reuse_guard on public.screenings;
create trigger screenings_failure_reuse_guard
  before insert or update on public.screenings
  for each row execute function public.guard_screening_failure_reuse();

revoke all on function public.guard_screening_failure_reuse() from public, anon, authenticated;
