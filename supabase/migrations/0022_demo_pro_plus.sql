-- =============================================================================
-- Demo / site de desarrollo: plan Pro+ en las organizaciones actuales
-- =============================================================================
-- Idempotente. Pensado para un proyecto de un solo clinical research site.
-- Límites Pro+: 2000 pacientes, 100 protocolos, 10 usuarios.

update public.organizations
set
  plan_id = 'pro_plus',
  subscription_status = 'active',
  trial_ends_at = now() + interval '365 days',
  patient_limit = 2000,
  protocol_limit = 100,
  user_limit = 10
where coalesce(plan_id, '') is distinct from 'pro_plus'
   or subscription_status is distinct from 'active'
   or patient_limit is distinct from 2000
   or protocol_limit is distinct from 100
   or user_limit is distinct from 10;

update public.profiles
set plan = 'pro_plus'
where coalesce(plan, '') is distinct from 'pro_plus';
