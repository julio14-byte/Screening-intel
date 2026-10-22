-- Intervalo de cobro del plan vigente. Los límites siguen en plan_id.
alter table public.organizations
  add column if not exists billing_interval text;

alter table public.organizations
  drop constraint if exists organizations_billing_interval_check;

alter table public.organizations
  add constraint organizations_billing_interval_check
  check (billing_interval is null or billing_interval in ('month', 'year'));

comment on column public.organizations.billing_interval is
  'month o year. Null en Free. El anual cobra 10 meses del mismo plan.';

-- Las suscripciones que ya existen se crearon con el precio mensual.
update public.organizations
set billing_interval = 'month'
where billing_interval is null
  and plan_id in ('pro', 'pro_plus');
