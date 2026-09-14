-- =============================================================================
-- DEV / pruebas: activar plan Pro+ sin pasar por Stripe
-- =============================================================================
-- Ejecutar en Supabase SQL Editor.
-- Actualiza TODAS las orgs del proyecto (un solo clinical research site).
-- Equivale a supabase/migrations/0022_demo_pro_plus.sql

update public.organizations
set
  plan_id = 'pro_plus',
  subscription_status = 'active',
  trial_ends_at = now() + interval '365 days',
  patient_limit = 2000,
  protocol_limit = 100,
  user_limit = 10;

update public.profiles
set plan = 'pro_plus';

-- Verificar
select id, name, slug, plan_id, subscription_status,
       patient_limit, protocol_limit, user_limit, trial_ends_at
from public.organizations
order by created_at;
