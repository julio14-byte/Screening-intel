-- Randomizado: coordinador o PI cuando el IRT del sponsor ya asignó kit.
-- Crisvia no opera IWRS; no consultar protocol_iwrs_config (módulo retirado).

create or replace function public.enforce_screening_status_rbac()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
begin
  v_role := public.get_user_app_role();

  if v_role = 'monitor'::public.app_role then
    raise exception 'Monitor CRA: acceso de solo lectura. No se permiten modificaciones.';
  end if;

  if new.status = 'randomized'::public.screening_status
     and old.status is distinct from new.status
     and v_role not in (
       'investigator'::public.app_role,
       'sub_investigator'::public.app_role,
       'coordinator'::public.app_role
     ) then
    raise exception 'Tu rol no puede marcar Randomizado.';
  end if;

  return new;
end;
$$;
