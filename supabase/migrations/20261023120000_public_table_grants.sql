-- =============================================================================
-- Tablas de public: acceso explícito a la Data API
-- =============================================================================
-- Desde el 30 de octubre de 2026 Supabase no concede privilegios al crear
-- tablas, secuencias ni funciones en public. Sin un GRANT, PostgREST responde
-- 42501 antes de evaluar RLS. Los privilegios que ya existían se quedan; esta
-- migración deja el mismo resultado en un proyecto viejo y en uno nuevo:
--   * service_role: select, insert, update y delete (el servidor, sin RLS)
--   * authenticated: solo las operaciones que ya tiene una política
--   * anon: insert en waitlist, select de protocols y de la vista portal_sites
-- No se conceden truncate, references, trigger ni maintain.

do $defaults$
declare
  owner_role text;
begin
  foreach owner_role in array array['postgres', 'supabase_admin']
  loop
    if exists (select 1 from pg_roles where rolname = owner_role) then
      execute format(
        'alter default privileges for role %I in schema public revoke all on tables from anon, authenticated, service_role',
        owner_role
      );
      execute format(
        'alter default privileges for role %I in schema public revoke all on sequences from anon, authenticated, service_role',
        owner_role
      );
      execute format(
        'alter default privileges for role %I in schema public revoke execute on functions from public, anon, authenticated, service_role',
        owner_role
      );
    end if;
  end loop;
end
$defaults$;

-- La política pública de protocols leía organizations y por eso anon recibía
-- "permission denied" en cuanto se le quitó el SELECT de esa tabla.
create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create or replace function private.portal_org_accepts_candidates(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organizations o
    where o.id = p_organization_id
      and o.portal_enabled = true
  );
$$;

comment on function private.portal_org_accepts_candidates(uuid) is
  'Verdadero si el centro tiene el portal activo. No expone el resto de organizations.';

revoke all on function private.portal_org_accepts_candidates(uuid) from public;
grant execute on function private.portal_org_accepts_candidates(uuid)
  to anon, authenticated, service_role;

drop policy if exists "protocols_select_portal_public" on public.protocols;
create policy "protocols_select_portal_public"
  on public.protocols for select
  to anon
  using (
    status = 'active'::public.protocol_status
    and private.portal_org_accepts_candidates(clinic_id)
  );

do $tables$
declare
  rec record;
  privs text;
begin
  for rec in
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
  loop
    execute format(
      'revoke all on table public.%I from public, anon, authenticated, service_role',
      rec.table_name
    );
    execute format(
      'grant select, insert, update, delete on table public.%I to service_role',
      rec.table_name
    );
  end loop;

  for rec in
    select
      tablename,
      bool_or(cmd in ('SELECT', 'ALL')) as can_select,
      bool_or(cmd in ('INSERT', 'ALL')) as can_insert,
      bool_or(cmd in ('UPDATE', 'ALL')) as can_update,
      bool_or(cmd in ('DELETE', 'ALL')) as can_delete
    from pg_policies
    where schemaname = 'public'
      and 'authenticated' = any (roles)
      and tablename <> 'patient_reuse_consents'
    group by tablename
  loop
    privs := concat_ws(
      ', ',
      case when rec.can_select then 'select' end,
      case when rec.can_insert then 'insert' end,
      case when rec.can_update then 'update' end,
      case when rec.can_delete then 'delete' end
    );
    if privs <> '' then
      execute format(
        'grant %s on table public.%I to authenticated',
        privs,
        rec.tablename
      );
    end if;
  end loop;
end
$tables$;

-- Columnas que el cliente no puede reescribir, aunque la política sea de update.
revoke update on table public.patient_medications from authenticated;
grant update (ended_on, verified_on, dose, source_ref)
  on table public.patient_medications to authenticated;

revoke update on table public.delegation_assignments from authenticated;
grant update (ended_on) on table public.delegation_assignments to authenticated;

grant select (
  id, organization_id, patient_id, status, basis, purpose, note,
  consented_on, expires_on, authorized_by, revoked_at, revoked_by, created_at
) on table public.patient_reuse_consents to authenticated;
grant insert (
  organization_id, patient_id, basis, purpose, note, consented_on, expires_on
) on table public.patient_reuse_consents to authenticated;
grant update (status) on table public.patient_reuse_consents to authenticated;

grant insert on table public.waitlist to anon;
grant select on table public.protocols to anon;

revoke all on table public.portal_sites from public, anon, authenticated, service_role;
grant select on table public.portal_sites to anon, authenticated, service_role;
alter view public.portal_sites set (security_barrier = true);

revoke all on table public.epro_questions from public, anon, authenticated, service_role;
grant select on table public.epro_questions to authenticated, service_role;

do $functions$
declare
  fn regprocedure;
  fn_name text;
begin
  for fn, fn_name in
    select p.oid::regprocedure, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to service_role', fn);
    if fn_name in ('rate_limit_hit', 'handle_new_user') then
      execute format('revoke all on function %s from authenticated', fn);
    else
      execute format('grant execute on function %s to authenticated', fn);
    end if;
  end loop;
end
$functions$;

do $auth_admin$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.handle_new_user() to supabase_auth_admin;
  end if;
end
$auth_admin$;
