-- Aplica en base de datos los límites de plan (pacientes, protocolos activos,
-- usuarios) que la app muestra en Facturación. Sin esto, los límites eran solo
-- informativos y cualquier cliente podía excederlos desde la API.
--
-- Solo bloquea NUEVAS filas cuando la organización ya alcanzó el límite; no
-- borra ni oculta datos existentes. Idempotente.

set statement_timeout = '30s';
set lock_timeout = '8s';

create or replace function public.enforce_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id uuid;
  max_allowed integer;
  current_count integer;
  label text;
begin
  if tg_table_name = 'patients' then
    org_id := new.clinic_id;
    select patient_limit into max_allowed
      from public.organizations where id = org_id;
    select count(*) into current_count
      from public.patients where clinic_id = org_id;
    label := 'pacientes';
  elsif tg_table_name = 'protocols' then
    if new.status is distinct from 'active' then
      return new;
    end if;
    org_id := new.clinic_id;
    select protocol_limit into max_allowed
      from public.organizations where id = org_id;
    select count(*) into current_count
      from public.protocols where clinic_id = org_id and status = 'active';
    label := 'protocolos activos';
  elsif tg_table_name = 'organization_members' then
    org_id := new.organization_id;
    select user_limit into max_allowed
      from public.organizations where id = org_id;
    select count(*) into current_count
      from public.organization_members where organization_id = org_id;
    label := 'usuarios';
  else
    return new;
  end if;

  if max_allowed is not null and current_count >= max_allowed then
    raise exception 'Límite del plan alcanzado: % (máx. %). Mejora tu plan en Facturación.',
      label, max_allowed
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_plan_limit() from public, anon, authenticated;

drop trigger if exists patients_enforce_plan_limit on public.patients;
create trigger patients_enforce_plan_limit
  before insert on public.patients
  for each row execute function public.enforce_plan_limit();

drop trigger if exists protocols_enforce_plan_limit on public.protocols;
create trigger protocols_enforce_plan_limit
  before insert on public.protocols
  for each row execute function public.enforce_plan_limit();

drop trigger if exists organization_members_enforce_plan_limit on public.organization_members;
create trigger organization_members_enforce_plan_limit
  before insert on public.organization_members
  for each row execute function public.enforce_plan_limit();
