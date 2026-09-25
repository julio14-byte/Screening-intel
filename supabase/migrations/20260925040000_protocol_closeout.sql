-- Cierre de estudio: limpieza (queries del monitor), Database Lock irreversible,
-- apertura del ciego, snapshot descriptivo, CSR del centro y registro de
-- sometimiento. No es gateway FDA/EMA/COFEPRIS ni reemplazo de SAS/R.

set statement_timeout = '60s';
set lock_timeout = '8s';

create table if not exists public.protocol_closeouts (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations (id) on delete cascade,
  protocol_id        uuid not null references public.protocols (id) on delete restrict,
  phase              text not null default 'cleaning',
  lock_attestation   text not null default '',
  locked_at          timestamptz,
  locked_by          uuid references auth.users (id) on delete set null,
  unblind_reason     text not null default '',
  unblinded_at       timestamptz,
  unblinded_by       uuid references auth.users (id) on delete set null,
  analysis_snapshot  jsonb not null default '{}'::jsonb,
  analyzed_at        timestamptz,
  analyzed_by        uuid references auth.users (id) on delete set null,
  csr_markdown       text not null default '',
  csr_generated_at   timestamptz,
  agencies           text[] not null default '{}',
  submission_notes   text not null default '',
  submitted_at       timestamptz,
  submitted_by       uuid references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint protocol_closeouts_protocol_uidx unique (protocol_id),
  constraint protocol_closeouts_phase_ck check (
    phase in ('cleaning', 'locked', 'unblinded', 'analyzed', 'csr', 'submitted')
  ),
  constraint protocol_closeouts_lock_ck check (
    (phase = 'cleaning' and locked_at is null)
    or (phase <> 'cleaning' and locked_at is not null and length(btrim(lock_attestation)) >= 20)
  ),
  constraint protocol_closeouts_unblind_ck check (
    phase in ('cleaning', 'locked')
    or (unblinded_at is not null and length(btrim(unblind_reason)) >= 8)
  )
);

comment on table public.protocol_closeouts is
  'Pipeline de cierre del protocolo. El lock es irreversible en la app. No envía expedientes a agencias.';

comment on column public.protocol_closeouts.phase is
  'cleaning → locked → unblinded → analyzed → csr → submitted. Nunca vuelve a cleaning.';

comment on column public.protocol_closeouts.analysis_snapshot is
  'Conteos del centro (n/brazo, EA, adherencia). No es análisis oficial SAS/R.';

create index if not exists protocol_closeouts_org_idx
  on public.protocol_closeouts (organization_id, phase);

drop trigger if exists protocol_closeouts_set_updated_at on public.protocol_closeouts;
create trigger protocol_closeouts_set_updated_at
  before update on public.protocol_closeouts
  for each row execute function public.set_updated_at();

create table if not exists public.closeout_queries (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations (id) on delete cascade,
  protocol_id          uuid not null references public.protocols (id) on delete restrict,
  closeout_id          uuid references public.protocol_closeouts (id) on delete cascade,
  patient_id           uuid references public.patients (id) on delete set null,
  follow_up_visit_id   uuid references public.follow_up_visits (id) on delete set null,
  field_hint           text not null default '',
  description          text not null,
  status               text not null default 'open',
  answer_notes         text not null default '',
  opened_by            uuid references auth.users (id) on delete set null,
  answered_by          uuid references auth.users (id) on delete set null,
  closed_by            uuid references auth.users (id) on delete set null,
  opened_at            timestamptz not null default now(),
  answered_at          timestamptz,
  closed_at            timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint closeout_queries_status_ck check (status in ('open', 'answered', 'closed')),
  constraint closeout_queries_description_ck check (length(btrim(description)) >= 8)
);

comment on table public.closeout_queries is
  'Queries de limpieza del monitor CRA (dato faltante o justificación). Deben cerrarse antes del lock.';

create index if not exists closeout_queries_protocol_status_idx
  on public.closeout_queries (protocol_id, status);

create index if not exists closeout_queries_org_idx
  on public.closeout_queries (organization_id, opened_at desc);

drop trigger if exists closeout_queries_set_updated_at on public.closeout_queries;
create trigger closeout_queries_set_updated_at
  before update on public.closeout_queries
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- ¿Está congelada la base del protocolo?
-- -----------------------------------------------------------------------------
create or replace function public.protocol_database_locked(p_protocol_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.protocol_closeouts
    where protocol_id = p_protocol_id
      and phase <> 'cleaning'
  );
$$;

comment on function public.protocol_database_locked(uuid) is
  'true si el protocolo ya pasó Database Lock. Nadie puede alterar celdas clínicas.';

revoke all on function public.protocol_database_locked(uuid) from public, anon;
grant execute on function public.protocol_database_locked(uuid) to authenticated;

create or replace function public.closeout_scan(p_protocol_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_issues jsonb := '[]'::jsonb;
  v_open integer := 0;
  v_scheduled integer := 0;
  v_missing_bp integer := 0;
begin
  if p_protocol_id is null then
    return jsonb_build_object('ready', false, 'issues', jsonb_build_array(
      jsonb_build_object('code', 'protocol', 'message', 'Protocolo inválido.')
    ));
  end if;

  select count(*) into v_open
  from public.closeout_queries
  where protocol_id = p_protocol_id
    and status in ('open', 'answered');

  if v_open > 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'open_queries',
      'message', format('%s quer%s de limpieza sin cerrar (el monitor debe cerrarlas).',
        v_open, case when v_open = 1 then 'y' else 'ies' end)
    ));
  end if;

  select count(*) into v_scheduled
  from public.follow_up_visits
  where protocol_id = p_protocol_id
    and status = 'scheduled';

  if v_scheduled > 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'scheduled_visits',
      'message', format('%s visita(s) de seguimiento aún programada(s). Completala o marcala perdida/justificada.', v_scheduled)
    ));
  end if;

  select count(*) into v_missing_bp
  from public.follow_up_visits
  where protocol_id = p_protocol_id
    and status in ('completed', 'out_of_window')
    and (systolic is null or diastolic is null or heart_rate is null);

  if v_missing_bp > 0 then
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'code', 'missing_vitals',
      'message', format('%s visita(s) sin presión arterial o frecuencia cardíaca. El centro debe cargarla o justificarla.', v_missing_bp)
    ));
  end if;

  return jsonb_build_object(
    'ready', jsonb_array_length(v_issues) = 0,
    'open_queries', v_open,
    'scheduled_visits', v_scheduled,
    'missing_vitals', v_missing_bp,
    'issues', v_issues
  );
end;
$$;

revoke all on function public.closeout_scan(uuid) from public, anon;
grant execute on function public.closeout_scan(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Congelar tablas clínicas del protocolo (nadie altera una celda)
-- -----------------------------------------------------------------------------
create or replace function public.enforce_protocol_database_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_protocol uuid;
  v_form uuid;
begin
  -- Desenlace de emergencia IWRS (un paciente) y apertura del ciego del estudio:
  -- solo pueden tocar columnas de unblind después del lock.
  if tg_table_name = 'iwrs_randomizations' and tg_op = 'UPDATE' then
    if (new.unblinded_at is distinct from old.unblinded_at
        or new.unblinded_by is distinct from old.unblinded_by
        or new.unblind_reason is distinct from old.unblind_reason)
       and new.kit_code is not distinct from old.kit_code
       and new.slot_id is not distinct from old.slot_id
       and new.patient_id is not distinct from old.patient_id
       and new.screening_id is not distinct from old.screening_id
       and new.stratum is not distinct from old.stratum
       and new.protocol_id is not distinct from old.protocol_id
       and new.organization_id is not distinct from old.organization_id
       and new.randomized_at is not distinct from old.randomized_at
       and new.randomized_by is not distinct from old.randomized_by
    then
      return new;
    end if;
  end if;

  if tg_table_name in ('epro_responses', 'epro_daily_answers') then
    v_form := case tg_op
      when 'DELETE' then old.form_id
      else new.form_id
    end;
    select protocol_id into v_protocol
    from public.epro_forms
    where id = v_form;
  elsif tg_table_name = 'iwrs_arm_assignments' then
    select protocol_id into v_protocol
    from public.iwrs_randomizations
    where id = case tg_op when 'DELETE' then old.randomization_id else new.randomization_id end;
  else
    v_protocol := case tg_op
      when 'DELETE' then old.protocol_id
      else coalesce(new.protocol_id, old.protocol_id)
    end;
  end if;

  if v_protocol is not null and public.protocol_database_locked(v_protocol) then
    raise exception 'Database Lock: la base del protocolo está congelada. Nadie puede modificar una celda.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'follow_up_visits',
    'protocol_visit_schedules',
    'study_visits',
    'screenings',
    'prescriptions',
    'dosing_diary_entries',
    'dosing_diary_links',
    'epro_responses',
    'epro_daily_answers',
    'iwrs_randomizations',
    'iwrs_slots',
    'iwrs_arm_assignments',
    'closeout_queries'
  ]
  loop
    execute format(
      'drop trigger if exists aaa_protocol_database_lock on public.%I;
       create trigger aaa_protocol_database_lock
         before insert or update or delete on public.%I
         for each row execute function public.enforce_protocol_database_lock();',
      t, t
    );
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPCs de cierre (PI / sub)
-- -----------------------------------------------------------------------------
create or replace function public.closeout_lock(
  p_protocol_id uuid,
  p_attestation text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_scan jsonb;
  v_row public.protocol_closeouts;
begin
  if auth.uid() is null then
    raise exception 'No autenticado.';
  end if;
  if not public.is_clinical_lead() then
    raise exception 'Solo el investigador o sub-investigador pueden bloquear la base.';
  end if;
  if p_attestation is null or length(btrim(p_attestation)) < 20 then
    raise exception 'La declaración de bloqueo debe tener al menos 20 caracteres.';
  end if;

  select clinic_id into v_org
  from public.protocols
  where id = p_protocol_id;

  if v_org is null then
    raise exception 'Protocolo no encontrado.';
  end if;
  if v_org not in (select public.get_user_organization_ids()) then
    raise exception 'Fuera de tu centro.';
  end if;

  v_scan := public.closeout_scan(p_protocol_id);
  if coalesce((v_scan->>'ready')::boolean, false) is not true then
    raise exception 'La base no está limpia. Cerrá las queries de limpieza y completá o justificá las visitas pendientes.';
  end if;

  insert into public.protocol_closeouts (
    organization_id, protocol_id, phase, lock_attestation, locked_at, locked_by
  )
  values (
    v_org, p_protocol_id, 'locked', btrim(p_attestation), now(), auth.uid()
  )
  on conflict (protocol_id) do update
    set
      phase = excluded.phase,
      lock_attestation = excluded.lock_attestation,
      locked_at = excluded.locked_at,
      locked_by = excluded.locked_by
    where public.protocol_closeouts.phase = 'cleaning'
  returning * into v_row;

  if not found or v_row.phase is distinct from 'locked' then
    raise exception 'El protocolo ya estaba bloqueado. El lock es irreversible.';
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'phase', v_row.phase,
    'locked_at', v_row.locked_at
  );
end;
$$;

revoke all on function public.closeout_lock(uuid, text) from public, anon;
grant execute on function public.closeout_lock(uuid, text) to authenticated;

create or replace function public.closeout_unblind_study(
  p_protocol_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.protocol_closeouts;
  v_updated integer := 0;
begin
  if auth.uid() is null then
    raise exception 'No autenticado.';
  end if;
  if not public.is_clinical_lead() then
    raise exception 'Solo el investigador o sub-investigador pueden abrir el ciego del estudio.';
  end if;
  if p_reason is null or length(btrim(p_reason)) < 8 then
    raise exception 'Indicá el motivo de la apertura del ciego (mínimo 8 caracteres).';
  end if;

  select * into v_row
  from public.protocol_closeouts
  where protocol_id = p_protocol_id
  for update;

  if not found then
    raise exception 'Primero hay que bloquear la base (Database Lock).';
  end if;
  if v_row.organization_id not in (select public.get_user_organization_ids()) then
    raise exception 'Fuera de tu centro.';
  end if;
  if v_row.phase = 'cleaning' then
    raise exception 'La apertura del ciego es solo después del Database Lock.';
  end if;
  if v_row.phase <> 'locked' then
    raise exception 'El ciego del estudio ya fue abierto.';
  end if;

  update public.iwrs_randomizations
    set
      unblinded_at = now(),
      unblinded_by = auth.uid(),
      unblind_reason = btrim(p_reason)
    where protocol_id = p_protocol_id
      and unblinded_at is null;
  get diagnostics v_updated = row_count;

  update public.protocol_closeouts
    set
      phase = 'unblinded',
      unblind_reason = btrim(p_reason),
      unblinded_at = now(),
      unblinded_by = auth.uid()
    where id = v_row.id
    returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'phase', v_row.phase,
    'unblinded_at', v_row.unblinded_at,
    'assignments_unblinded', v_updated
  );
end;
$$;

revoke all on function public.closeout_unblind_study(uuid, text) from public, anon;
grant execute on function public.closeout_unblind_study(uuid, text) to authenticated;

-- El desenlace de emergencia IWRS (un sujeto, motivo clínico) sigue en iwrs_unblind.
-- No se toca aquí a propósito: seguridad ≠ apertura del ciego del estudio.

alter table public.protocol_closeouts enable row level security;
alter table public.closeout_queries enable row level security;

drop policy if exists protocol_closeouts_select on public.protocol_closeouts;
create policy protocol_closeouts_select
  on public.protocol_closeouts for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists protocol_closeouts_insert on public.protocol_closeouts;
create policy protocol_closeouts_insert
  on public.protocol_closeouts for insert to authenticated
  with check (
    organization_id in (select public.get_user_organization_ids())
    and (
      public.can_write_clinical_data()
      or public.get_user_app_role() = 'monitor'::public.app_role
    )
  );

drop policy if exists protocol_closeouts_update on public.protocol_closeouts;
create policy protocol_closeouts_update
  on public.protocol_closeouts for update to authenticated
  using (
    public.is_clinical_lead()
    and organization_id in (select public.get_user_organization_ids())
  )
  with check (
    public.is_clinical_lead()
    and organization_id in (select public.get_user_organization_ids())
  );

drop policy if exists closeout_queries_select on public.closeout_queries;
create policy closeout_queries_select
  on public.closeout_queries for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists closeout_queries_insert on public.closeout_queries;
create policy closeout_queries_insert
  on public.closeout_queries for insert to authenticated
  with check (
    organization_id in (select public.get_user_organization_ids())
    and (
      public.can_write_clinical_data()
      or public.get_user_app_role() = 'monitor'::public.app_role
    )
  );

drop policy if exists closeout_queries_update on public.closeout_queries;
create policy closeout_queries_update
  on public.closeout_queries for update to authenticated
  using (
    organization_id in (select public.get_user_organization_ids())
    and (
      public.can_write_clinical_data()
      or public.get_user_app_role() = 'monitor'::public.app_role
    )
  )
  with check (
    organization_id in (select public.get_user_organization_ids())
    and (
      public.can_write_clinical_data()
      or public.get_user_app_role() = 'monitor'::public.app_role
    )
  );

revoke all on table public.protocol_closeouts from anon, public;
revoke all on table public.closeout_queries from anon, public;

grant select, insert, update on table public.protocol_closeouts to authenticated;
grant select, insert, update on table public.closeout_queries to authenticated;

notify pgrst, 'reload schema';
