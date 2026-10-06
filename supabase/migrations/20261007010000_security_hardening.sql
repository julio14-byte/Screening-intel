-- Endurecimiento de seguridad (auditoría de octubre 2026).
--
--  1. Roles clínicos: un investigador solo puede gestionar roles de usuarios
--     de SU organización (antes podía tocar cualquier user_id del sistema).
--  2. Bitácora: record_custom_audit_event ya no acepta un p_user_id arbitrario
--     de sesiones autenticadas, exige sesión, valida tabla y que el registro
--     pertenezca a la organización del usuario, y limita el tamaño.
--  3. Rate limiting compartido (serverless) para login, portal público y APIs
--     de IA. Solo ejecutable con service_role.
--
-- Idempotente. Aplicar en SQL Editor de Supabase si `db push` no corrió.

set statement_timeout = '30s';
set lock_timeout = '8s';

-- -----------------------------------------------------------------------------
-- 1) Roles acotados a la organización
-- -----------------------------------------------------------------------------
create or replace function public.shares_organization_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members mine
    join public.organization_members theirs
      on theirs.organization_id = mine.organization_id
    where mine.user_id = auth.uid()
      and theirs.user_id = p_user_id
  );
$$;

revoke all on function public.shares_organization_with(uuid) from public, anon;
grant execute on function public.shares_organization_with(uuid) to authenticated;

create or replace function public.assign_user_clinical_role(
  p_user_id uuid,
  p_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_role public.app_role;
begin
  if not public.can_manage_clinical_roles() then
    raise exception 'Solo el Investigador Principal puede asignar roles clínicos.';
  end if;

  if not public.shares_organization_with(p_user_id) then
    raise exception 'Ese usuario no pertenece a tu organización.';
  end if;

  v_caller_role := public.get_user_app_role();

  if p_user_id = auth.uid() and p_role <> v_caller_role then
    raise exception 'No puedes cambiar tu propio rol; otro investigador debe hacerlo.';
  end if;

  insert into public.user_roles (user_id, role, assigned_by)
  values (p_user_id, p_role, auth.uid())
  on conflict (user_id) do update
    set role = excluded.role,
        assigned_by = excluded.assigned_by,
        updated_at = now();
end;
$$;

drop policy if exists "user_roles_select" on public.user_roles;
create policy "user_roles_select"
  on public.user_roles for select to authenticated
  using (
    user_id = auth.uid()
    or (public.can_manage_clinical_roles() and public.shares_organization_with(user_id))
  );

drop policy if exists "user_roles_insert_investigator" on public.user_roles;
create policy "user_roles_insert_investigator"
  on public.user_roles for insert to authenticated
  with check (
    public.can_manage_clinical_roles() and public.shares_organization_with(user_id)
  );

drop policy if exists "user_roles_update_investigator" on public.user_roles;
create policy "user_roles_update_investigator"
  on public.user_roles for update to authenticated
  using (
    public.can_manage_clinical_roles() and public.shares_organization_with(user_id)
  )
  with check (
    public.can_manage_clinical_roles() and public.shares_organization_with(user_id)
  );

drop policy if exists "user_roles_delete_investigator" on public.user_roles;
create policy "user_roles_delete_investigator"
  on public.user_roles for delete to authenticated
  using (
    public.can_manage_clinical_roles() and public.shares_organization_with(user_id)
  );

-- -----------------------------------------------------------------------------
-- 2) Bitácora: actor real, tabla permitida, registro de tu organización
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
  v_uid uuid := auth.uid();
  v_is_service boolean := coalesce(auth.role(), '') = 'service_role';
  v_user_id uuid;
  v_owned boolean := false;
  v_payload jsonb;
begin
  if v_uid is null and not v_is_service then
    raise exception 'Se requiere sesión para registrar eventos de auditoría.';
  end if;

  if p_table_name not in ('patients', 'protocols', 'screenings', 'clinical_profiles') then
    raise exception 'Tabla de auditoría no permitida: %', p_table_name;
  end if;

  if coalesce(length(p_description), 0) = 0 or length(p_description) > 1000 then
    raise exception 'Descripción de auditoría inválida.';
  end if;

  if pg_column_size(coalesce(p_metadata, '{}'::jsonb)) > 8192 then
    raise exception 'Metadatos de auditoría demasiado grandes.';
  end if;

  if not v_is_service then
    v_user_id := v_uid;

    if p_table_name = 'patients' then
      select exists (
        select 1 from public.patients t
        where t.id = p_record_id
          and t.clinic_id in (select public.get_user_organization_ids())
      ) into v_owned;
    elsif p_table_name = 'protocols' then
      select exists (
        select 1 from public.protocols t
        where t.id = p_record_id
          and t.clinic_id in (select public.get_user_organization_ids())
      ) into v_owned;
    elsif p_table_name = 'screenings' then
      select exists (
        select 1
        from public.screenings s
        join public.patients p on p.id = s.patient_id
        where s.id = p_record_id
          and p.clinic_id in (select public.get_user_organization_ids())
      ) into v_owned;
    else
      select exists (
        select 1
        from public.clinical_profiles c
        join public.patients p on p.id = c.patient_id
        where c.id = p_record_id
          and p.clinic_id in (select public.get_user_organization_ids())
      ) into v_owned;
    end if;

    if not v_owned then
      raise exception 'El registro no pertenece a tu organización.';
    end if;
  else
    v_user_id := coalesce(p_user_id, v_uid);
  end if;

  v_payload := jsonb_build_object(
    'description', p_description,
    'metadata', coalesce(p_metadata, '{}'::jsonb),
    'recorded_at', now()
  );

  return audit.insert_log(v_user_id, 'CUSTOM', p_table_name, p_record_id, null, v_payload);
end;
$$;

revoke all on function public.record_custom_audit_event(text, uuid, text, jsonb, uuid)
  from public, anon;
grant execute on function public.record_custom_audit_event(text, uuid, text, jsonb, uuid)
  to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3) Rate limiting compartido entre instancias serverless
-- -----------------------------------------------------------------------------
create table if not exists public.rate_limits (
  key          text primary key,
  hits         integer not null default 0,
  window_start timestamptz not null default now()
);

alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from anon, authenticated;

create or replace function public.rate_limit_hit(
  p_key text,
  p_max integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.rate_limits;
begin
  insert into public.rate_limits as r (key, hits, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set hits = case
          when r.window_start + make_interval(secs => p_window_seconds) <= now() then 1
          else r.hits + 1
        end,
        window_start = case
          when r.window_start + make_interval(secs => p_window_seconds) <= now() then now()
          else r.window_start
        end
  returning * into v_row;

  if random() < 0.01 then
    delete from public.rate_limits
    where window_start < now() - interval '1 day';
  end if;

  if v_row.hits > p_max then
    return query select
      false,
      greatest(1, ceil(extract(epoch from (
        v_row.window_start + make_interval(secs => p_window_seconds) - now()
      )))::integer);
  else
    return query select true, 0;
  end if;
end;
$$;

revoke all on function public.rate_limit_hit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
