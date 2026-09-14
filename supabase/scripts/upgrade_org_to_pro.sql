-- =============================================================================
-- DEV / pruebas: activar plan Pro+ sin pasar por Stripe
-- =============================================================================
-- Ejecutar en Supabase SQL Editor.
-- Por defecto actualiza la org de demo@screening.local.

-- Opción A (default): cuenta demo
update public.organizations o
set
  plan_id = 'pro_plus',
  subscription_status = 'active',
  trial_ends_at = now() + interval '365 days',
  patient_limit = 2000,
  protocol_limit = 100,
  user_limit = 10
where o.id in (
  select om.organization_id
  from public.organization_members om
  join public.profiles p on p.id = om.user_id
  where lower(p.email) = 'demo@screening.local'
);

-- Opción B: por slug del centro
-- update public.organizations
-- set
--   plan_id = 'pro_plus',
--   subscription_status = 'active',
--   trial_ends_at = now() + interval '365 days',
--   patient_limit = 2000,
--   protocol_limit = 100,
--   user_limit = 10
-- where slug = 'demo';

-- Sincronizar perfil de usuarios de orgs Pro+
update public.profiles p
set plan = 'pro_plus'
from public.organization_members om
where om.user_id = p.id
  and om.organization_id in (
    select id from public.organizations where plan_id = 'pro_plus'
  );

-- Verificar
select id, name, slug, plan_id, subscription_status,
       patient_limit, protocol_limit, user_limit, trial_ends_at
from public.organizations
order by created_at;
