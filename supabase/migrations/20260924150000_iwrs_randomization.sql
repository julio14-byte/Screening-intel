-- IWRS del site: randomización por bloques permutados después del screening.
-- No cambia el motor de elegibilidad. El matching sigue siendo reglas 🟢🟡🔴.

set statement_timeout = '60s';
set lock_timeout = '8s';

-- -----------------------------------------------------------------------------
-- Config por protocolo
-- -----------------------------------------------------------------------------
create table if not exists public.protocol_iwrs_config (
  protocol_id       uuid primary key references public.protocols (id) on delete cascade,
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  enabled           boolean not null default false,
  blinding          text not null default 'open'
    check (blinding in ('open', 'single', 'double')),
  block_size        integer not null default 4
    check (block_size between 2 and 24),
  stratify_gender   boolean not null default true,
  updated_at        timestamptz not null default now()
);

comment on table public.protocol_iwrs_config is
  'IWRS por protocolo. enabled=false: el tracker puede marcar Randomizado a mano.';
comment on column public.protocol_iwrs_config.blinding is
  'open: todos ven el brazo. single: solo PI/sub. double: nadie hasta desenlace de emergencia.';

drop trigger if exists protocol_iwrs_config_set_updated_at on public.protocol_iwrs_config;
create trigger protocol_iwrs_config_set_updated_at
  before update on public.protocol_iwrs_config
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Brazos
-- -----------------------------------------------------------------------------
create table if not exists public.protocol_arms (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations (id) on delete cascade,
  protocol_id         uuid not null references public.protocols (id) on delete cascade,
  code                text not null,
  name                text not null,
  allocation_weight   integer not null default 1 check (allocation_weight between 1 and 9),
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  constraint protocol_arms_code_not_blank check (length(btrim(code)) > 0),
  constraint protocol_arms_name_not_blank check (length(btrim(name)) > 0),
  constraint protocol_arms_code_unique unique (protocol_id, code)
);

comment on table public.protocol_arms is
  'Brazos del estudio (activo, placebo, etc.). allocation_weight define la razón (1:1, 2:1).';

create index if not exists protocol_arms_protocol_idx
  on public.protocol_arms (protocol_id, sort_order, code);

-- -----------------------------------------------------------------------------
-- Lista de randomización (oculta: sin SELECT autenticado)
-- -----------------------------------------------------------------------------
create table if not exists public.iwrs_slots (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  protocol_id      uuid not null references public.protocols (id) on delete cascade,
  arm_id           uuid not null references public.protocol_arms (id) on delete restrict,
  stratum          text not null default 'all',
  sequence         integer not null,
  claimed_at       timestamptz,
  constraint iwrs_slots_sequence_unique unique (protocol_id, stratum, sequence)
);

comment on table public.iwrs_slots is
  'Lista ciega de bloques permutados. No se expone por PostgREST.';

create index if not exists iwrs_slots_next_idx
  on public.iwrs_slots (protocol_id, stratum, sequence)
  where claimed_at is null;

-- -----------------------------------------------------------------------------
-- Asignación (kit visible; brazo en tabla separada)
-- -----------------------------------------------------------------------------
create table if not exists public.iwrs_randomizations (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  protocol_id      uuid not null references public.protocols (id) on delete restrict,
  patient_id       uuid not null references public.patients (id) on delete restrict,
  screening_id     uuid not null references public.screenings (id) on delete restrict,
  slot_id          uuid not null references public.iwrs_slots (id) on delete restrict,
  stratum          text not null,
  kit_code         text not null,
  randomized_by    uuid not null references auth.users (id) on delete restrict,
  randomized_at    timestamptz not null default now(),
  unblinded_at     timestamptz,
  unblinded_by     uuid references auth.users (id) on delete set null,
  unblind_reason   text not null default '',
  constraint iwrs_randomizations_patient_unique unique (protocol_id, patient_id),
  constraint iwrs_randomizations_screening_unique unique (screening_id),
  constraint iwrs_randomizations_slot_unique unique (slot_id),
  constraint iwrs_randomizations_kit_unique unique (protocol_id, kit_code)
);

comment on table public.iwrs_randomizations is
  'Asignación IWRS. kit_code es lo que ve el equipo ciego. El brazo vive en iwrs_arm_assignments.';

create index if not exists iwrs_randomizations_org_at_idx
  on public.iwrs_randomizations (organization_id, randomized_at desc);
create index if not exists iwrs_randomizations_patient_idx
  on public.iwrs_randomizations (patient_id);

create table if not exists public.iwrs_arm_assignments (
  randomization_id uuid primary key references public.iwrs_randomizations (id) on delete cascade,
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  arm_id           uuid not null references public.protocol_arms (id) on delete restrict
);

comment on table public.iwrs_arm_assignments is
  'Brazo asignado. RLS lo oculta según el cegamiento del protocolo.';

-- -----------------------------------------------------------------------------
-- Visibilidad del brazo
-- -----------------------------------------------------------------------------
create or replace function public.iwrs_arm_visible(p_randomization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.iwrs_randomizations r
    join public.protocol_iwrs_config c on c.protocol_id = r.protocol_id
    where r.id = p_randomization_id
      and r.organization_id in (select public.get_user_organization_ids())
      and (
        c.blinding = 'open'
        or r.unblinded_at is not null
        or (
          c.blinding = 'single'
          and public.is_clinical_lead()
        )
      )
  );
$$;

revoke all on function public.iwrs_arm_visible(uuid) from public;
grant execute on function public.iwrs_arm_visible(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Append de un bloque (lista ciega)
-- -----------------------------------------------------------------------------
create or replace function public.iwrs_append_block(
  p_protocol_id uuid,
  p_stratum text,
  p_arm_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_next int;
  v_arm uuid;
  v_added int := 0;
begin
  if auth.uid() is null then
    raise exception 'No autenticado.';
  end if;
  if not public.can_write_clinical_data() then
    raise exception 'Sin permiso para operar IWRS.';
  end if;
  if p_arm_ids is null or array_length(p_arm_ids, 1) is null then
    raise exception 'Bloque vacío.';
  end if;

  select clinic_id into v_org
  from public.protocols
  where id = p_protocol_id;

  if v_org is null then
    raise exception 'Protocolo no encontrado.';
  end if;
  if v_org not in (select public.get_user_organization_ids()) then
    raise exception 'Protocolo fuera de tu centro.';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_protocol_id::text || ':' || coalesce(p_stratum, 'all')));

  select coalesce(max(sequence), 0) + 1 into v_next
  from public.iwrs_slots
  where protocol_id = p_protocol_id
    and stratum = coalesce(nullif(btrim(p_stratum), ''), 'all');

  foreach v_arm in array p_arm_ids
  loop
    insert into public.iwrs_slots (
      organization_id, protocol_id, arm_id, stratum, sequence
    ) values (
      v_org,
      p_protocol_id,
      v_arm,
      coalesce(nullif(btrim(p_stratum), ''), 'all'),
      v_next
    );
    v_next := v_next + 1;
    v_added := v_added + 1;
  end loop;

  return v_added;
end;
$$;

revoke all on function public.iwrs_append_block(uuid, text, uuid[]) from public;
revoke all on function public.iwrs_append_block(uuid, text, uuid[]) from anon;
grant execute on function public.iwrs_append_block(uuid, text, uuid[]) to authenticated;

-- -----------------------------------------------------------------------------
-- Randomizar un screening
-- -----------------------------------------------------------------------------
create or replace function public.iwrs_randomize(p_screening_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scr public.screenings;
  v_patient public.patients;
  v_cfg public.protocol_iwrs_config;
  v_stratum text;
  v_slot public.iwrs_slots;
  v_kit text;
  v_seq int;
  v_row public.iwrs_randomizations;
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'No autenticado.';
  end if;
  if not public.can_write_clinical_data() then
    raise exception 'Sin permiso para randomizar.';
  end if;

  select * into v_scr
  from public.screenings
  where id = p_screening_id
  for update;

  if not found then
    raise exception 'Screening no encontrado.';
  end if;

  if v_scr.status is distinct from 'screening'::public.screening_status then
    raise exception 'Solo se randomiza un paciente en etapa Screening (visitas de screening hechas).';
  end if;

  select * into v_patient
  from public.patients
  where id = v_scr.patient_id;

  if v_patient.clinic_id not in (select public.get_user_organization_ids()) then
    raise exception 'Paciente fuera de tu centro.';
  end if;

  select * into v_cfg
  from public.protocol_iwrs_config
  where protocol_id = v_scr.protocol_id;

  if v_cfg is null or not v_cfg.enabled then
    raise exception 'Este protocolo no tiene IWRS activo.';
  end if;

  if exists (
    select 1 from public.iwrs_randomizations r
    where r.protocol_id = v_scr.protocol_id and r.patient_id = v_scr.patient_id
  ) then
    raise exception 'Este paciente ya fue randomizado en el protocolo.';
  end if;

  v_stratum := case
    when v_cfg.stratify_gender then coalesce(v_patient.gender::text, 'all')
    else 'all'
  end;

  perform pg_advisory_xact_lock(hashtext(v_scr.protocol_id::text || ':' || v_stratum));

  select * into v_slot
  from public.iwrs_slots s
  where s.protocol_id = v_scr.protocol_id
    and s.stratum = v_stratum
    and s.claimed_at is null
  order by s.sequence
  limit 1
  for update skip locked;

  if not found then
    raise exception 'NEED_BLOCK'
      using errcode = 'P0001';
  end if;

  select coalesce(max((regexp_replace(kit_code, '^.*-', ''))::int), 0) + 1
    into v_seq
  from public.iwrs_randomizations
  where protocol_id = v_scr.protocol_id
    and kit_code ~ '-[0-9]+$';

  select upper(left(regexp_replace(code_name, '[^A-Za-z0-9]', '', 'g'), 8))
    into v_code
  from public.protocols
  where id = v_scr.protocol_id;

  v_kit := coalesce(nullif(v_code, ''), 'KIT') || '-' || lpad(v_seq::text, 4, '0');

  insert into public.iwrs_randomizations (
    organization_id,
    protocol_id,
    patient_id,
    screening_id,
    slot_id,
    stratum,
    kit_code,
    randomized_by
  ) values (
    v_patient.clinic_id,
    v_scr.protocol_id,
    v_scr.patient_id,
    v_scr.id,
    v_slot.id,
    v_stratum,
    v_kit,
    auth.uid()
  )
  returning * into v_row;

  insert into public.iwrs_arm_assignments (
    randomization_id, organization_id, arm_id
  ) values (
    v_row.id, v_patient.clinic_id, v_slot.arm_id
  );

  update public.iwrs_slots
    set claimed_at = now()
    where id = v_slot.id;

  update public.screenings
    set status = 'randomized'::public.screening_status
    where id = v_scr.id;

  return jsonb_build_object(
    'id', v_row.id,
    'kit_code', v_row.kit_code,
    'stratum', v_row.stratum,
    'randomized_at', v_row.randomized_at,
    'arm_visible', public.iwrs_arm_visible(v_row.id)
  );
end;
$$;

revoke all on function public.iwrs_randomize(uuid) from public;
revoke all on function public.iwrs_randomize(uuid) from anon;
grant execute on function public.iwrs_randomize(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Desenlace de emergencia (solo PI / sub)
-- -----------------------------------------------------------------------------
create or replace function public.iwrs_unblind(
  p_randomization_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.iwrs_randomizations;
begin
  if auth.uid() is null then
    raise exception 'No autenticado.';
  end if;
  if not public.is_clinical_lead() then
    raise exception 'Solo el investigador o sub-investigador pueden desenmascarar.';
  end if;
  if p_reason is null or length(btrim(p_reason)) < 8 then
    raise exception 'Indicá el motivo clínico del desenlace (mínimo 8 caracteres).';
  end if;

  select * into v_row
  from public.iwrs_randomizations
  where id = p_randomization_id
  for update;

  if not found then
    raise exception 'Asignación no encontrada.';
  end if;
  if v_row.organization_id not in (select public.get_user_organization_ids()) then
    raise exception 'Fuera de tu centro.';
  end if;
  if v_row.unblinded_at is not null then
    raise exception 'Ya estaba desenmascarada.';
  end if;

  update public.iwrs_randomizations
    set
      unblinded_at = now(),
      unblinded_by = auth.uid(),
      unblind_reason = btrim(p_reason)
    where id = v_row.id
    returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'unblinded_at', v_row.unblinded_at
  );
end;
$$;

revoke all on function public.iwrs_unblind(uuid, text) from public;
revoke all on function public.iwrs_unblind(uuid, text) from anon;
grant execute on function public.iwrs_unblind(uuid, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Triggers de screening
-- -----------------------------------------------------------------------------
create or replace function public.enforce_screening_status_rbac()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_iwrs boolean;
begin
  v_role := public.get_user_app_role();

  if v_role = 'monitor'::public.app_role then
    raise exception 'Monitor CRA: acceso de solo lectura. No se permiten modificaciones.';
  end if;

  v_iwrs := exists (
    select 1 from public.protocol_iwrs_config c
    where c.protocol_id = new.protocol_id and c.enabled
  );

  if new.status = 'randomized'::public.screening_status
     and old.status is distinct from new.status then
    if v_iwrs and not exists (
      select 1 from public.iwrs_randomizations r where r.screening_id = new.id
    ) then
      raise exception 'Este protocolo usa IWRS. Randomizá desde el módulo IWRS; no arrastres la tarjeta.';
    end if;

    if not v_iwrs
       and not public.is_clinical_lead() then
      raise exception
        'Solo Investigador Principal o Sub-investigador pueden marcar Apto / Randomizado.';
    end if;
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.protocol_iwrs_config enable row level security;
alter table public.protocol_arms enable row level security;
alter table public.iwrs_slots enable row level security;
alter table public.iwrs_randomizations enable row level security;
alter table public.iwrs_arm_assignments enable row level security;

drop policy if exists protocol_iwrs_config_select on public.protocol_iwrs_config;
create policy protocol_iwrs_config_select
  on public.protocol_iwrs_config for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists protocol_iwrs_config_write on public.protocol_iwrs_config;
create policy protocol_iwrs_config_insert
  on public.protocol_iwrs_config for insert to authenticated
  with check (
    public.is_clinical_lead()
    and organization_id in (select public.get_user_organization_ids())
  );

drop policy if exists protocol_iwrs_config_update on public.protocol_iwrs_config;
create policy protocol_iwrs_config_update
  on public.protocol_iwrs_config for update to authenticated
  using (
    public.is_clinical_lead()
    and organization_id in (select public.get_user_organization_ids())
  )
  with check (
    public.is_clinical_lead()
    and organization_id in (select public.get_user_organization_ids())
  );

drop policy if exists protocol_arms_select on public.protocol_arms;
create policy protocol_arms_select
  on public.protocol_arms for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists protocol_arms_insert on public.protocol_arms;
create policy protocol_arms_insert
  on public.protocol_arms for insert to authenticated
  with check (
    public.is_clinical_lead()
    and organization_id in (select public.get_user_organization_ids())
  );

drop policy if exists protocol_arms_update on public.protocol_arms;
create policy protocol_arms_update
  on public.protocol_arms for update to authenticated
  using (
    public.is_clinical_lead()
    and organization_id in (select public.get_user_organization_ids())
  )
  with check (
    public.is_clinical_lead()
    and organization_id in (select public.get_user_organization_ids())
  );

-- Slots: sin SELECT para authenticated (la lista es ciega). El RPC escribe.
drop policy if exists iwrs_slots_deny_select on public.iwrs_slots;

drop policy if exists iwrs_randomizations_select on public.iwrs_randomizations;
create policy iwrs_randomizations_select
  on public.iwrs_randomizations for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists iwrs_arm_assignments_select on public.iwrs_arm_assignments;
create policy iwrs_arm_assignments_select
  on public.iwrs_arm_assignments for select to authenticated
  using (
    organization_id in (select public.get_user_organization_ids())
    and public.iwrs_arm_visible(randomization_id)
  );

drop trigger if exists iwrs_randomizations_audit_trail on public.iwrs_randomizations;
create trigger iwrs_randomizations_audit_trail
  after update or delete on public.iwrs_randomizations
  for each row execute function audit.capture_row_change();

revoke all on table public.protocol_iwrs_config from anon;
revoke all on table public.protocol_arms from anon;
revoke all on table public.iwrs_slots from anon, authenticated, public;
revoke all on table public.iwrs_randomizations from anon;
revoke all on table public.iwrs_arm_assignments from anon;

grant select, insert, update on table public.protocol_iwrs_config to authenticated;
grant select, insert, update on table public.protocol_arms to authenticated;
grant select on table public.iwrs_randomizations to authenticated;
grant select on table public.iwrs_arm_assignments to authenticated;

notify pgrst, 'reload schema';
