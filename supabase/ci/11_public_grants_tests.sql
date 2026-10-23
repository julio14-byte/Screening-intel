-- Comprueba los GRANT explícitos de public (Supabase, 30 oct 2026).
\set ON_ERROR_STOP on
\pset pager off

begin;

do $$
begin
  if has_table_privilege('anon', 'public.patients', 'SELECT')
     or has_table_privilege('anon', 'public.patients', 'INSERT') then
    raise exception 'FALLO: anon conserva privilegios sobre patients';
  end if;
  if has_table_privilege('anon', 'public.organizations', 'SELECT') then
    raise exception 'FALLO: anon puede leer organizations';
  end if;
  if has_table_privilege('anon', 'public.waitlist', 'SELECT')
     or not has_table_privilege('anon', 'public.waitlist', 'INSERT') then
    raise exception 'FALLO: waitlist debe ser solo insert para anon';
  end if;
  if not has_table_privilege('anon', 'public.protocols', 'SELECT')
     or has_table_privilege('anon', 'public.protocols', 'INSERT') then
    raise exception 'FALLO: anon solo lee protocols';
  end if;
  if not has_table_privilege('anon', 'public.portal_sites', 'SELECT')
     or has_table_privilege('anon', 'public.portal_sites', 'INSERT') then
    raise exception 'FALLO: anon solo lee portal_sites';
  end if;
  if not has_table_privilege('authenticated', 'public.patients', 'SELECT')
     or not has_table_privilege('authenticated', 'public.patients', 'INSERT')
     or not has_table_privilege('authenticated', 'public.patients', 'DELETE') then
    raise exception 'FALLO: authenticated perdió el acceso de patients que cubre RLS';
  end if;
  if has_table_privilege('authenticated', 'public.patients', 'TRUNCATE') then
    raise exception 'FALLO: authenticated no debe truncar patients';
  end if;
  if not has_table_privilege('service_role', 'public.pre_screen_submissions', 'INSERT')
     or not has_table_privilege('service_role', 'public.patients', 'SELECT') then
    raise exception 'FALLO: service_role no puede usar la Data API';
  end if;
  if has_column_privilege('authenticated', 'public.patient_medications', 'drug_name', 'UPDATE')
     or not has_column_privilege('authenticated', 'public.patient_medications', 'ended_on', 'UPDATE') then
    raise exception 'FALLO: la medicación conciliada quedó reescribible o no se puede cerrar';
  end if;
  if has_function_privilege('anon', 'public.rate_limit_hit(text,integer,integer)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.rate_limit_hit(text,integer,integer)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.rate_limit_hit(text,integer,integer)', 'EXECUTE') then
    raise exception 'FALLO: rate_limit_hit no quedó solo para service_role';
  end if;
  if has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.handle_new_user()', 'EXECUTE') then
    raise exception 'FALLO: handle_new_user sigue expuesto';
  end if;
  if not has_function_privilege('authenticated', 'public.get_user_organization_ids()', 'EXECUTE') then
    raise exception 'FALLO: authenticated no puede evaluar RLS';
  end if;
  if exists (
    select 1
    from pg_default_acl d
    join pg_namespace n on n.oid = d.defaclnamespace
    cross join lateral aclexplode(d.defaclacl) e
    join pg_roles r on r.oid = e.grantee
    where n.nspname = 'public'
      and r.rolname in ('anon', 'authenticated', 'service_role')
  ) then
    raise exception 'FALLO: public sigue concediendo privilegios por defecto';
  end if;
  raise notice 'ok  privilegios explícitos de public';
end $$;

create table public._grant_probe (id int);
do $$
begin
  if has_table_privilege('anon', 'public._grant_probe', 'SELECT')
     or has_table_privilege('authenticated', 'public._grant_probe', 'SELECT')
     or has_table_privilege('service_role', 'public._grant_probe', 'SELECT') then
    raise exception 'FALLO: una tabla nueva de public quedó expuesta sin GRANT';
  end if;
  raise notice 'ok  tabla nueva de public sin exponer';
end $$;
drop table public._grant_probe;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-0000000000a1', 'abierto@test.mx', '{"full_name":"Abierto"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'cerrado@test.mx', '{"full_name":"Cerrado"}');

update public.organizations
   set portal_enabled = true, slug = 'sitio-abierto'
 where id = (
   select organization_id from public.organization_members
    where user_id = '00000000-0000-0000-0000-0000000000a1'
 );

insert into public.protocols (clinic_id, title, code_name, status)
select organization_id, 'Estudio abierto', 'OPEN-1', 'active'
  from public.organization_members
 where user_id = '00000000-0000-0000-0000-0000000000a1';

insert into public.protocols (clinic_id, title, code_name, status)
select organization_id, 'Estudio cerrado', 'CLOSED-1', 'active'
  from public.organization_members
 where user_id = '00000000-0000-0000-0000-0000000000b2';

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', 'anon', true);

do $$
declare
  n int;
begin
  select count(*) into n from public.protocols;
  if n <> 1 then
    raise exception 'FALLO: anon ve % protocolos y debía ver 1', n;
  end if;
  select count(*) into n from public.portal_sites;
  if n <> 1 then
    raise exception 'FALLO: anon ve % centros en el portal y debía ver 1', n;
  end if;
  begin
    perform 1 from public.organizations;
    raise exception 'FALLO: anon leyó organizations';
  exception
    when insufficient_privilege then
      null;
  end;
  insert into public.waitlist (email, source) values ('anon@test.mx', 'prueba');
  begin
    perform 1 from public.waitlist;
    raise exception 'FALLO: anon leyó waitlist';
  exception
    when insufficient_privilege then
      null;
  end;
  raise notice 'ok  anon solo ve el portal abierto y anota la lista de espera';
end $$;

rollback;
