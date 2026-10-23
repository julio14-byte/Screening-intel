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

insert into public.criterion_reviews
  (organization_id, patient_id, protocol_id, criterion, criterion_type, engine_status, decision, note)
select p.clinic_id, p.id, pr.id, 'Edad 18 a 65 años', 'inclusion', 'pass', 'clarify', 'Pendiente de acta'
  from public.patients p join public.protocols pr on pr.clinic_id = p.clinic_id;

insert into public.patient_medications (organization_id, patient_id, drug_name)
select p.clinic_id, p.id, 'Metformina' from public.patients p;

insert into public.protocol_visit_schedules (organization_id, protocol_id, visit_code, title, target_day)
select clinic_id, id, 'V1', 'Semana 4', 28 from public.protocols;

insert into public.follow_up_visits
  (organization_id, patient_id, protocol_id, schedule_id, baseline_on, target_on, window_start_on, window_end_on, scheduled_on)
select p.clinic_id, p.id, pr.id, sc.id, current_date - 28, current_date, current_date - 2, current_date + 2, current_date
  from public.patients p
  join public.protocols pr on pr.clinic_id = p.clinic_id
  join public.protocol_visit_schedules sc on sc.protocol_id = pr.id;

insert into public.diary_reviews
  (organization_id, patient_id, protocol_id, source_system, source_ref, period_start, period_end, expected_days, completed_days)
select p.clinic_id, p.id, pr.id, 'veeva', 'Sujeto seed', current_date - 27, current_date, 28, 28
  from public.patients p join public.protocols pr on pr.clinic_id = p.clinic_id;

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
       set_config('t.proto_a', (select id::text from public.protocols where clinic_id = (select org_a from _t_orgs)), true),
       set_config('t.pat_a', (select id::text from public.patients where clinic_id = (select org_a from _t_orgs)), true),
       set_config('t.pat_b', (select id::text from public.patients where clinic_id = (select org_b from _t_orgs)), true),
       set_config('t.visit_a', (select id::text from public.follow_up_visits where organization_id = (select org_a from _t_orgs)), true),
       set_config('t.visit_b', (select id::text from public.follow_up_visits where organization_id = (select org_b from _t_orgs)), true),
       set_config('t.proto_b', (select id::text from public.protocols where clinic_id = (select org_b from _t_orgs)), true);

-- ── anon: sin acceso a nada ─────────────────────────────────────────────
select pg_temp.act_as('anon');
select pg_temp.expect_count('anon no ve pacientes', 'select 1 from public.patients', 0);
select pg_temp.expect_count('anon no ve screenings', 'select 1 from public.screenings', 0);
select pg_temp.expect_count('anon no ve perfil de sitio', 'select 1 from public.site_profiles', 0);
select pg_temp.expect_count('anon no ve metas de enrolamiento', 'select 1 from public.protocol_enrollment_targets', 0);
select pg_temp.expect_count('anon no ve bitácora de contacto', 'select 1 from public.candidate_contact_attempts', 0);
select pg_temp.expect_count('anon no ve revisiones ni medicación',
  'select 1 from public.criterion_reviews union all select 1 from public.patient_medications', 0);
select pg_temp.expect_count('anon no ve revisiones de diario', 'select 1 from public.diary_reviews', 0);
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
select pg_temp.expect_count('inv_a ve solo sus revisiones', 'select 1 from public.criterion_reviews', 1);
select pg_temp.expect_count('inv_a ve solo su medicación', 'select 1 from public.patient_medications', 1);
select pg_temp.expect_denied('inv_a no edita ni corrige revisiones',
  'update public.criterion_reviews set decision = ''confirmed''');
select pg_temp.expect_denied('inv_a no borra revisiones',
  'delete from public.criterion_reviews');
select pg_temp.expect_count('inv_a ve solo sus revisiones de diario', 'select 1 from public.diary_reviews', 1);
select pg_temp.expect_denied('inv_a no edita ni borra revisiones de diario',
  'update public.diary_reviews set missed_doses = 5');
select pg_temp.expect_denied('inv_a no borra revisiones de diario', 'delete from public.diary_reviews');
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
select pg_temp.expect_allowed('coord_a registra una revisión con fuente',
  format($q$insert into public.criterion_reviews
              (organization_id, patient_id, protocol_id, criterion, criterion_type, engine_status,
               decision, source_type, source_ref, observed_on)
            select %L, %L, id, 'Lab hba1c', 'inclusion', 'pass', 'confirmed', 'lab_report', 'Folio 123', current_date
            from public.protocols where clinic_id = %L$q$, current_setting('t.org_a'), current_setting('t.pat_a'), current_setting('t.org_a')));
select pg_temp.expect_count('la revisión guarda el rol real del revisor',
  'select 1 from public.criterion_reviews where reviewer_role = ''coordinator'' and reviewer_id is not null', 1);
select pg_temp.expect_denied('una decisión firme sin fuente se rechaza',
  format($q$insert into public.criterion_reviews
              (organization_id, patient_id, protocol_id, criterion, criterion_type, engine_status, decision)
            select %L, %L, id, 'Lab x', 'inclusion', 'pass', 'confirmed' from public.protocols where clinic_id = %L$q$,
         current_setting('t.org_a'), current_setting('t.pat_a'), current_setting('t.org_a')));
select pg_temp.expect_denied('no se revisa un paciente de otra sede',
  format($q$insert into public.criterion_reviews
              (organization_id, patient_id, protocol_id, criterion, criterion_type, engine_status,
               decision, source_type, source_ref, observed_on)
            select %L, %L, id, 'Lab x', 'inclusion', 'pass', 'confirmed', 'other', 'x', current_date
            from public.protocols where clinic_id = %L$q$, current_setting('t.org_a'), current_setting('t.pat_b'), current_setting('t.org_a')));
select pg_temp.expect_allowed('coord_a concilia un medicamento',
  format($q$insert into public.patient_medications (organization_id, patient_id, drug_name, dose, started_on)
            values (%L, %L, 'Atorvastatina', '20 mg', '2025-01-01')$q$, current_setting('t.org_a'), current_setting('t.pat_a')));
select pg_temp.expect_allowed('coord_a cierra la vigencia de un medicamento',
  'update public.patient_medications set ended_on = current_date where drug_name = ''Atorvastatina''');
select pg_temp.expect_denied('coord_a no renombra un medicamento conciliado',
  'update public.patient_medications set drug_name = ''Otro''');
select pg_temp.expect_denied('coord_a no concilia medicación de otra sede',
  format($q$insert into public.patient_medications (organization_id, patient_id, drug_name)
            values (%L, %L, 'Aspirina')$q$, current_setting('t.org_a'), current_setting('t.pat_b')));
select pg_temp.expect_allowed('coord_a registra una revisión de diario ligada a la visita',
  format($q$insert into public.diary_reviews
              (organization_id, patient_id, protocol_id, visit_id, source_system, source_ref,
               period_start, period_end, expected_days, completed_days, missed_doses, possible_ae, ae_note)
            values (%L, %L, %L, %L, 'veeva', 'Sujeto 1042', current_date - 27, current_date, 28, 24, 3, true, 'Mareo leve')$q$,
         current_setting('t.org_a'), current_setting('t.pat_a'), current_setting('t.proto_a'), current_setting('t.visit_a')));
select pg_temp.expect_allowed('coord_a registra un diario de Clinical Ink',
  format($q$insert into public.diary_reviews
              (organization_id, patient_id, protocol_id, source_system, source_ref, period_start, period_end, expected_days, completed_days)
            values (%L, %L, %L, 'clinical_ink', 'Sujeto 2001', current_date - 6, current_date, 7, 7)$q$,
         current_setting('t.org_a'), current_setting('t.pat_a'), current_setting('t.proto_a')));
select pg_temp.expect_count('la revisión de diario guarda el rol real del revisor',
  'select 1 from public.diary_reviews where reviewer_role = ''coordinator'' and reviewer_id is not null', 2);
select pg_temp.expect_denied('revisión de diario con más días completados que esperados',
  format($q$insert into public.diary_reviews
              (organization_id, patient_id, protocol_id, source_system, source_ref, period_start, period_end, expected_days, completed_days)
            values (%L, %L, %L, 'veeva', 'x', current_date - 6, current_date, 7, 8)$q$,
         current_setting('t.org_a'), current_setting('t.pat_a'), current_setting('t.proto_a')));
select pg_temp.expect_denied('posible EA sin descripción se rechaza',
  format($q$insert into public.diary_reviews
              (organization_id, patient_id, protocol_id, source_system, source_ref, period_start, period_end, expected_days, completed_days, possible_ae)
            values (%L, %L, %L, 'veeva', 'x', current_date - 6, current_date, 7, 7, true)$q$,
         current_setting('t.org_a'), current_setting('t.pat_a'), current_setting('t.proto_a')));
select pg_temp.expect_denied('no se liga el diario a una visita de otra sede',
  format($q$insert into public.diary_reviews
              (organization_id, patient_id, protocol_id, visit_id, source_system, source_ref, period_start, period_end, expected_days, completed_days)
            values (%L, %L, %L, %L, 'veeva', 'x', current_date - 6, current_date, 7, 7)$q$,
         current_setting('t.org_a'), current_setting('t.pat_a'), current_setting('t.proto_a'), current_setting('t.visit_b')));
select pg_temp.expect_denied('no se registra diario de un paciente de otra sede',
  format($q$insert into public.diary_reviews
              (organization_id, patient_id, protocol_id, source_system, source_ref, period_start, period_end, expected_days, completed_days)
            values (%L, %L, %L, 'veeva', 'x', current_date - 6, current_date, 7, 7)$q$,
         current_setting('t.org_a'), current_setting('t.pat_b'), current_setting('t.proto_a')));
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
select pg_temp.expect_denied('mon_a no registra revisiones',
  format($q$insert into public.criterion_reviews
              (organization_id, patient_id, protocol_id, criterion, criterion_type, engine_status, decision, note)
            select %L, %L, id, 'x', 'inclusion', 'pass', 'clarify', 'nota' from public.protocols where clinic_id = %L$q$,
         current_setting('t.org_a'), current_setting('t.pat_a'), current_setting('t.org_a')));
select pg_temp.expect_denied('mon_a no concilia medicación',
  format($q$insert into public.patient_medications (organization_id, patient_id, drug_name)
            values (%L, %L, 'Aspirina')$q$, current_setting('t.org_a'), current_setting('t.pat_a')));
select pg_temp.expect_denied('mon_a no registra revisiones de diario',
  format($q$insert into public.diary_reviews
              (organization_id, patient_id, protocol_id, source_system, source_ref, period_start, period_end, expected_days, completed_days)
            values (%L, %L, %L, 'veeva', 'x', current_date - 6, current_date, 7, 7)$q$,
         current_setting('t.org_a'), current_setting('t.pat_a'), current_setting('t.proto_a')));
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
