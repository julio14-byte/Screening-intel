-- =============================================================================
-- DEV / pruebas: activar plan Pro sin pasar por Stripe
-- =============================================================================
-- Ejecutar en Supabase SQL Editor.
-- Cambia el filtro WHERE según tu org (slug, email del owner, o id).

-- Opción A: por slug del centro (recomendado)
-- update public.organizations o
-- set
--   plan_id = 'pro',
--   subscription_status = 'active',
--   trial_ends_at = now() + interval '365 days',
--   patient_limit = 500,
--   protocol_limit = 50,
--   user_limit = 3
-- where slug = 'demo';

-- Opción B: tu primera / única organización
update public.organizations o
set
  plan_id = 'pro',
  subscription_status = 'active',
  trial_ends_at = now() + interval '365 days',
  patient_limit = 500,
  protocol_limit = 50,
  user_limit = 3
where o.id = (
  select id from public.organizations
  order by created_at
  limit 1
);

-- Sincronizar perfil de usuarios del site
update public.profiles p
set plan = 'pro'
from public.organization_members om
where om.user_id = p.id
  and om.organization_id in (
    select id from public.organizations where plan_id = 'pro'
  );

-- Verificar
select id, name, slug, plan_id, subscription_status,
       patient_limit, protocol_limit, user_limit, trial_ends_at
from public.organizations
order by created_at;
