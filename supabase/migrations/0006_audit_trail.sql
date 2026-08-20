-- =============================================================================
-- Screening Intelligence — Audit Trail (CFR Part 11 / 21 CFR Part 11 ready)
-- =============================================================================
-- Registra de forma inmutable quién cambió qué, cuándo y con qué valores.
-- Ejecutar en el SQL Editor de Supabase o con `supabase db push`.
--
-- Diseño:
--   • audit_logs es append-only (sin UPDATE ni DELETE).
--   • Inserciones solo vía funciones SECURITY DEFINER en schema `audit`.
--   • Trigger automático en `patients` para UPDATE y DELETE.
--   • RPC pública para eventos manuales (aprobaciones, notas de auditoría).

create schema if not exists audit;

-- -----------------------------------------------------------------------------
-- audit_logs — Bitácora inmutable
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete set null,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE', 'CUSTOM')),
  table_name  text not null,
  record_id   uuid not null,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);

comment on table public.audit_logs is
  'Bitácora de auditoría inmutable (CFR Part 11). Solo INSERT vía funciones audit.*';

create index audit_logs_record_lookup_idx
  on public.audit_logs (table_name, record_id, created_at desc);

create index audit_logs_user_id_idx
  on public.audit_logs (user_id, created_at desc);

create index audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

-- -----------------------------------------------------------------------------
-- Inmutabilidad: prohibir UPDATE y DELETE en audit_logs
-- -----------------------------------------------------------------------------
create or replace function audit.prevent_audit_log_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception
    'audit_logs es inmutable (21 CFR Part 11). Operación % no permitida.',
    TG_OP;
end;
$$;

create trigger audit_logs_immutable_update
  before update on public.audit_logs
  for each row execute function audit.prevent_audit_log_mutation();

create trigger audit_logs_immutable_delete
  before delete on public.audit_logs
  for each row execute function audit.prevent_audit_log_mutation();

-- Revocar mutaciones directas desde roles expuestos
revoke insert, update, delete on public.audit_logs from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Función interna: insertar registro de auditoría
-- -----------------------------------------------------------------------------
create or replace function audit.insert_log(
  p_user_id    uuid,
  p_action     text,
  p_table_name text,
  p_record_id  uuid,
  p_old_data   jsonb,
  p_new_data   jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_action not in ('INSERT', 'UPDATE', 'DELETE', 'CUSTOM') then
    raise exception 'Acción de auditoría no válida: %', p_action;
  end if;

  insert into public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  )
  values (
    p_user_id,
    p_action,
    p_table_name,
    p_record_id,
    p_old_data,
    p_new_data
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function audit.insert_log(uuid, text, text, uuid, jsonb, jsonb)
  from public;
grant execute on function audit.insert_log(uuid, text, text, uuid, jsonb, jsonb)
  to service_role;

-- -----------------------------------------------------------------------------
-- Trigger genérico: captura UPDATE / DELETE en tablas clínicas
-- -----------------------------------------------------------------------------
create or replace function audit.capture_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id   uuid;
  v_old       jsonb;
  v_new       jsonb;
  v_record_id uuid;
begin
  -- Atribución al usuario autenticado (Supabase Auth JWT)
  v_user_id := auth.uid();

  if TG_OP = 'DELETE' then
    v_old := to_jsonb(OLD);
    v_new := null;
    v_record_id := OLD.id;
  elsif TG_OP = 'UPDATE' then
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := NEW.id;
  else
    return coalesce(NEW, OLD);
  end if;

  perform audit.insert_log(
    v_user_id,
    TG_OP,
    TG_TABLE_NAME,
    v_record_id,
    v_old,
    v_new
  );

  return coalesce(NEW, OLD);
end;
$$;

revoke all on function audit.capture_row_change() from public;
grant execute on function audit.capture_row_change() to service_role;

-- Trigger en patients (UPDATE y DELETE)
create trigger patients_audit_trail
  after update or delete on public.patients
  for each row execute function audit.capture_row_change();

-- -----------------------------------------------------------------------------
-- RPC: eventos de auditoría manuales (aprobaciones, notas clínicas)
-- -----------------------------------------------------------------------------
create or replace function public.record_custom_audit_event(
  p_table_name  text,
  p_record_id   uuid,
  p_description text,
  p_metadata    jsonb default '{}'::jsonb,
  p_user_id     uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_payload jsonb;
begin
  v_user_id := coalesce(p_user_id, auth.uid());

  v_payload := jsonb_build_object(
    'description', p_description,
    'metadata', coalesce(p_metadata, '{}'::jsonb),
    'recorded_at', now()
  );

  return audit.insert_log(
    v_user_id,
    'CUSTOM',
    p_table_name,
    p_record_id,
    null,
    v_payload
  );
end;
$$;

grant execute on function public.record_custom_audit_event(
  text, uuid, text, jsonb, uuid
) to authenticated;

-- MVP sin auth: permitir RPC desde anon para desarrollo (restringir en producción)
grant execute on function public.record_custom_audit_event(
  text, uuid, text, jsonb, uuid
) to anon;

-- -----------------------------------------------------------------------------
-- Row Level Security — audit_logs
-- -----------------------------------------------------------------------------
alter table public.audit_logs enable row level security;

create policy "staff read audit logs"
  on public.audit_logs
  for select
  to anon, authenticated
  using (true);

-- Sin políticas INSERT/UPDATE/DELETE: solo funciones SECURITY DEFINER escriben.
