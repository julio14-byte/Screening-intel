-- Pruebas de aislamiento multi-tenant y roles sobre Postgres real.
-- Requiere migraciones aplicadas y supabase/ci/00_supabase_shim.sql.
-- Cualquier aserción fallida lanza excepción y termina con código ≠ 0.
\set ON_ERROR_STOP on
\pset pager off

begin;

create temp table _t_users (alias text primary key, uid uuid not null);
grant all on _t_users to public;

create function pg_temp.mk_user(p_alias text, p_email text, p_role public.app_role)
returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (v_id, p_email, jsonb_build_object('full_name', p_alias));
  insert into public.user_roles (user_id, role)
  values (v_id, p_role)
  on conflict (user_id) do update set role = excluded.role;
  insert into _t_users values (p_alias, v_id);
  return v_id;
end $$;

select pg_temp.mk_user('inv_a', 'inv_a@test.mx', 'investigator');
select pg_temp.mk_user('coord_a', 'coord_a@test.mx', 'coordinator');
select pg_temp.mk_user('mon_a', 'mon_a@test.mx', 'monitor');
select pg_temp.mk_user('inv_b', 'inv_b@test.mx', 'investigator');

-- coord_a y mon_a comparten la organización de inv_a.
create temp table _t_orgs as
select
  (select organization_id from public.organization_members m join _t_users u on u.uid = m.user_id where u.alias = 'inv_a') as org_a,
  (select organization_id from public.organization_members m join _t_users u on u.uid = m.user_id where u.alias = 'inv_b') as org_b;
grant all on _t_orgs to public;

delete from public.organization_members
 where user_id in (select uid from _t_users where alias in ('coord_a','mon_a'));
delete from public.organizations o
 where o.id not in (select org_a from _t_orgs union select org_b from _t_orgs)
   and not exists (select 1 from public.organization_members m where m.organization_id = o.id);
update public.organizations set user_limit = 10 where id = (select org_a from _t_orgs);

insert into public.organization_members (organization_id, user_id, role)
select (select org_a from _t_orgs), uid, 'coordinator' from _t_users where alias in ('coord_a','mon_a');

insert into public.patients (clinic_id, first_name, last_name, birth_date, gender, subject_code)
values
  ((select org_a from _t_orgs), 'Ana', 'A', '1980-01-01', 'female', '100001'),
  ((select org_b from _t_orgs), 'Beto', 'B', '1980-01-01', 'male', '100001');

insert into public.protocols (clinic_id, title, code_name)
values
  ((select org_a from _t_orgs), 'Estudio A', 'PROT-A'),
  ((select org_b from _t_orgs), 'Estudio B', 'PROT-B');

insert into public.screenings (patient_id, protocol_id)
select p.id, pr.id
  from public.patients p
  join public.protocols pr on pr.clinic_id = p.clinic_id;

insert into public.site_profiles (organization_id, site_name)
values ((select org_a from _t_orgs), 'Sitio A'), ((select org_b from _t_orgs), 'Sitio B');

insert into public.protocol_enrollment_targets (organization_id, protocol_id, target_randomized)
select pr.clinic_id, pr.id, 10 from public.protocols pr;

insert into public.pre_screen_submissions
  (organization_id, referral_code, first_name, last_name, birth_date, gender, consent_at)
values
  ((select org_a from _t_orgs), 'REF-A', 'Cande', 'A', '1990-01-01', 'female', now()),
  ((select org_b from _t_orgs), 'REF-B', 'Cande', 'B', '1990-01-01', 'female', now());

insert into public.candidate_contact_attempts (organization_id, submission_id, channel, outcome)
select organization_id, id, 'phone', 'no_answer' from public.pre_screen_submissions;

insert into public.site_staff (organization_id, full_name, role_title)
values ((select org_a from _t_orgs), 'Staff A', 'coordinator'),
       ((select org_b from _t_orgs), 'Staff B', 'coordinator');

insert into public.delegation_assignments (organization_id, staff_id, protocol_id, tasks)
select st.organization_id, st.id, pr.id, array['consent']
  from public.site_staff st
  join public.protocols pr on pr.clinic_id = st.organization_id;

grant select on all tables in schema pg_temp to public;

create function pg_temp.act_as(p_alias text) returns void language plpgsql as $$
declare v_uid uuid;
begin
  if p_alias = 'anon' then
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claim.role', 'anon', true);
    set local role anon;
  else
    select uid into v_uid from _t_users where alias = p_alias;
    perform set_config('request.jwt.claim.sub', v_uid::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    set local role authenticated;
  end if;
end $$;
grant execute on function pg_temp.act_as(text) to public;

create function pg_temp.expect_count(p_label text, p_sql text, p_expected int) returns void
language plpgsql as $$
declare n int;
begin
  begin
    execute 'select count(*) from (' || p_sql || ') q' into n;
  exception when insufficient_privilege then
    n := 0;
  end;
  if n is distinct from p_expected then
    raise exception 'FALLO [%]: esperaba % filas y obtuvo %', p_label, p_expected, n;
  end if;
  raise notice 'ok  %', p_label;
end $$;
grant execute on function pg_temp.expect_count(text, text, int) to public;

-- Ejecuta una sentencia de escritura y exige que sea rechazada por RLS/privilegios
-- o que afecte 0 filas.
create function pg_temp.expect_denied(p_label text, p_sql text) returns void
language plpgsql as $$
declare n int;
begin
  begin
    execute p_sql;
    get diagnostics n = row_count;
    if n > 0 then
      raise exception 'FALLO [%]: la escritura afectó % filas y debía ser denegada', p_label, n;
    end if;
  exception
    when insufficient_privilege or check_violation then
      null;
  end;
  raise notice 'ok  %', p_label;
end $$;
grant execute on function pg_temp.expect_denied(text, text) to public;

create function pg_temp.expect_allowed(p_label text, p_sql text) returns void
language plpgsql as $$
declare n int;
begin
  execute p_sql;
  get diagnostics n = row_count;
  if n < 1 then
    raise exception 'FALLO [%]: la escritura no afectó filas', p_label;
  end if;
  raise notice 'ok  %', p_label;
end $$;
grant execute on function pg_temp.expect_allowed(text, text) to public;

-- Los alias de tablas temporales no son visibles tras `set role`; guardamos IDs en GUCs.
select set_config('t.org_a', (select org_a::text from _t_orgs), true),
       set_config('t.org_b', (select org_b::text from _t_orgs), true),
       set_config('t.sub_a', (select id::text from public.pre_screen_submissions where organization_id = (select org_a from _t_orgs)), true),
       set_config('t.sub_b', (select id::text from public.pre_screen_submissions where organization_id = (select org_b from _t_orgs)), true),
       set_config('t.staff_a', (select id::text from public.site_staff where organization_id = (select org_a from _t_orgs)), true),
       set_config('t.staff_b', (select id::text from public.site_staff where organization_id = (select org_b from _t_orgs)), true),
       set_config('t.proto_a', (select id::text from public.protocols where clinic_id = (select org_a from _t_orgs)), true),
       set_config('t.proto_b', (select id::text from public.protocols where clinic_id = (select org_b from _t_orgs)), true);

-- ── anon: sin acceso a nada ─────────────────────────────────────────────
select pg_temp.act_as('anon');
select pg_temp.expect_count('anon no ve pacientes', 'select 1 from public.patients', 0);
select pg_temp.expect_count('anon no ve screenings', 'select 1 from public.screenings', 0);
select pg_temp.expect_count('anon no ve perfil de sitio', 'select 1 from public.site_profiles', 0);
select pg_temp.expect_count('anon no ve metas de enrolamiento', 'select 1 from public.protocol_enrollment_targets', 0);
select pg_temp.expect_count('anon no ve bitácora de contacto', 'select 1 from public.candidate_contact_attempts', 0);
select pg_temp.expect_count('anon no ve equipo ni delegaciones',
  'select 1 from public.site_staff union all select 1 from public.delegation_assignments', 0);
select pg_temp.expect_denied('anon no inserta pacientes',
  format($q$insert into public.patients (clinic_id, first_name, last_name, birth_date, gender)
            values (%L, 'X', 'Y', '1990-01-01', 'male')$q$, current_setting('t.org_a')));
reset role;

-- ── investigador A: solo su organización ────────────────────────────────
select pg_temp.act_as('inv_a');
select pg_temp.expect_count('inv_a ve solo sus pacientes', 'select 1 from public.patients', 1);
select pg_temp.expect_count('inv_a no ve pacientes de B',
  format('select 1 from public.patients where clinic_id = %L', current_setting('t.org_b')), 0);
select pg_temp.expect_count('inv_a ve solo sus protocolos', 'select 1 from public.protocols', 1);
select pg_temp.expect_count('inv_a ve solo sus screenings', 'select 1 from public.screenings', 1);
select pg_temp.expect_count('inv_a ve solo su perfil de sitio', 'select 1 from public.site_profiles', 1);
select pg_temp.expect_denied('inv_a no inserta paciente en org B',
  format($q$insert into public.patients (clinic_id, first_name, last_name, birth_date, gender)
            values (%L, 'X', 'Y', '1990-01-01', 'male')$q$, current_setting('t.org_b')));
select pg_temp.expect_denied('inv_a no actualiza paciente de B',
  format('update public.patients set first_name = ''Hack'' where clinic_id = %L', current_setting('t.org_b')));
select pg_temp.expect_denied('inv_a no borra paciente de B',
  format('delete from public.patients where clinic_id = %L', current_setting('t.org_b')));
select pg_temp.expect_denied('inv_a no actualiza perfil de sitio de B',
  format('update public.site_profiles set site_name = ''Hack'' where organization_id = %L', current_setting('t.org_b')));
select pg_temp.expect_count('inv_a ve solo sus metas de enrolamiento', 'select 1 from public.protocol_enrollment_targets', 1);
select pg_temp.expect_denied('inv_a no cambia metas de B',
  format('update public.protocol_enrollment_targets set target_randomized = 1 where organization_id = %L', current_setting('t.org_b')));
select pg_temp.expect_count('inv_a ve solo su bitácora de contacto', 'select 1 from public.candidate_contact_attempts', 1);
select pg_temp.expect_denied('inv_a no edita la bitácora de contacto',
  'update public.candidate_contact_attempts set outcome = ''reached''');
select pg_temp.expect_denied('inv_a no borra la bitácora de contacto',
  'delete from public.candidate_contact_attempts');
select pg_temp.expect_count('inv_a ve solo su equipo', 'select 1 from public.site_staff', 1);
select pg_temp.expect_count('inv_a ve solo sus delegaciones', 'select 1 from public.delegation_assignments', 1);
select pg_temp.expect_allowed('inv_a da de alta personal',
  format($q$insert into public.site_staff (organization_id, full_name, role_title)
            values (%L, 'Nueva Enfermera', 'nurse')$q$, current_setting('t.org_a')));
select pg_temp.expect_denied('inv_a no da de alta personal en B',
  format($q$insert into public.site_staff (organization_id, full_name, role_title)
            values (%L, 'Intruso', 'nurse')$q$, current_setting('t.org_b')));
select pg_temp.expect_allowed('inv_a delega tareas',
  format($q$insert into public.delegation_assignments (organization_id, staff_id, protocol_id, tasks)
            values (%L, %L, %L, array['vitals','ecg'])$q$, current_setting('t.org_a'), current_setting('t.staff_a'), current_setting('t.proto_a')));
select pg_temp.expect_denied('inv_a no delega personal de B',
  format($q$insert into public.delegation_assignments (organization_id, staff_id, protocol_id, tasks)
            values (%L, %L, %L, array['vitals'])$q$, current_setting('t.org_a'), current_setting('t.staff_b'), current_setting('t.proto_a')));
select pg_temp.expect_denied('inv_a no delega tareas inexistentes',
  format($q$insert into public.delegation_assignments (organization_id, staff_id, protocol_id, tasks)
            values (%L, %L, %L, array['hackear'])$q$, current_setting('t.org_a'), current_setting('t.staff_a'), current_setting('t.proto_a')));
select pg_temp.expect_allowed('inv_a cierra una delegación con fecha de término',
  'update public.delegation_assignments set ended_on = current_date');
select pg_temp.expect_denied('inv_a no reescribe las tareas delegadas',
  'update public.delegation_assignments set tasks = array[''consent'',''randomization'']');
select pg_temp.expect_denied('inv_a no borra delegaciones',
  'delete from public.delegation_assignments');
select pg_temp.expect_denied('inv_a no edita personal de B',
  format('update public.site_staff set full_name = ''X'' where organization_id = %L', current_setting('t.org_b')));
select pg_temp.expect_allowed('inv_a actualiza su perfil de sitio',
  format('update public.site_profiles set site_name = ''Sitio A2'' where organization_id = %L', current_setting('t.org_a')));
select pg_temp.expect_allowed('inv_a actualiza sus pacientes',
  'update public.patients set phone = ''5555550000''');
reset role;

-- ── coordinador A: escribe datos clínicos, no perfil de sitio ───────────
select pg_temp.act_as('coord_a');
select pg_temp.expect_count('coord_a ve pacientes de su org', 'select 1 from public.patients', 1);
select pg_temp.expect_allowed('coord_a actualiza pacientes',
  'update public.patients set phone = ''5555551111''');
select pg_temp.expect_denied('coord_a no edita perfil de sitio',
  'update public.site_profiles set site_name = ''Hack''');
select pg_temp.expect_denied('coord_a no borra pacientes (solo investigador)',
  'delete from public.patients');
select pg_temp.expect_count('coord_a lee el equipo', 'select 1 from public.site_staff', 2);
select pg_temp.expect_denied('coord_a no edita personal',
  'update public.site_staff set full_name = ''X''');
select pg_temp.expect_denied('coord_a no delega',
  format($q$insert into public.delegation_assignments (organization_id, staff_id, protocol_id, tasks)
            values (%L, %L, %L, array['consent'])$q$, current_setting('t.org_a'), current_setting('t.staff_a'), current_setting('t.proto_a')));
select pg_temp.expect_allowed('coord_a registra un intento de contacto',
  format($q$insert into public.candidate_contact_attempts (organization_id, submission_id, channel, outcome)
            values (%L, %L, 'whatsapp', 'reached')$q$, current_setting('t.org_a'), current_setting('t.sub_a')));
select pg_temp.expect_denied('coord_a no registra contacto sobre candidato de B',
  format($q$insert into public.candidate_contact_attempts (organization_id, submission_id, channel, outcome)
            values (%L, %L, 'phone', 'reached')$q$, current_setting('t.org_a'), current_setting('t.sub_b')));
select pg_temp.expect_denied('coord_a no registra contacto en la org de B',
  format($q$insert into public.candidate_contact_attempts (organization_id, submission_id, channel, outcome)
            values (%L, %L, 'phone', 'reached')$q$, current_setting('t.org_b'), current_setting('t.sub_b')));
select pg_temp.expect_allowed('coord_a actualiza metas de enrolamiento',
  'update public.protocol_enrollment_targets set target_randomized = 20');
select pg_temp.expect_denied('coord_a no mueve una meta a un protocolo de B',
  format('update public.protocol_enrollment_targets set protocol_id = %L', current_setting('t.proto_b')));
reset role;

-- ── monitor A: solo lectura ─────────────────────────────────────────────
select pg_temp.act_as('mon_a');
select pg_temp.expect_count('mon_a lee pacientes de su org', 'select 1 from public.patients', 1);
select pg_temp.expect_denied('mon_a no actualiza pacientes',
  'update public.patients set phone = ''5555552222''');
select pg_temp.expect_denied('mon_a no inserta pacientes',
  format($q$insert into public.patients (clinic_id, first_name, last_name, birth_date, gender)
            values (%L, 'X', 'Y', '1990-01-01', 'male')$q$, current_setting('t.org_a')));
select pg_temp.expect_denied('mon_a no registra contactos',
  format($q$insert into public.candidate_contact_attempts (organization_id, submission_id, channel, outcome)
            values (%L, %L, 'phone', 'reached')$q$, current_setting('t.org_a'), current_setting('t.sub_a')));
select pg_temp.expect_denied('mon_a no actualiza screenings',
  'update public.screenings set status = ''screening''');
reset role;

-- ── investigador B: simétrico ───────────────────────────────────────────
select pg_temp.act_as('inv_b');
select pg_temp.expect_count('inv_b ve solo sus pacientes', 'select 1 from public.patients', 1);
select pg_temp.expect_count('inv_b no ve pacientes de A',
  format('select 1 from public.patients where clinic_id = %L', current_setting('t.org_a')), 0);
select pg_temp.expect_count('inv_b no ve auditoría de A',
  format($q$select 1 from public.audit_logs where (new_data->>'clinic_id') = %L$q$, current_setting('t.org_a')), 0);
reset role;

rollback;
\echo 'RLS: todas las aserciones pasaron'
