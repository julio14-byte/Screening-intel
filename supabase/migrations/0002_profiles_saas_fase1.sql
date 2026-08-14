-- =============================================================================
-- Profiles + SaaS organizations (Fase 1) — plantilla VibeFast adaptada
-- =============================================================================
-- Ejecutar después de 0001_initial_schema.sql

-- -----------------------------------------------------------------------------
-- profiles — extiende auth.users
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  plan        text not null default 'starter',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'Perfil público de cada usuario (1:1 con auth.users).';

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- organizations — tenant = research site / clínica (Fase 1: 1 sitio por owner)
-- -----------------------------------------------------------------------------
create table if not exists public.organizations (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null default 'Mi research site',
  slug                    text unique,
  plan_id                 text not null default 'starter',
  stripe_customer_id      text,
  stripe_subscription_id  text,
  subscription_status     text not null default 'trialing'
    check (
      subscription_status in (
        'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'unpaid'
      )
    ),
  trial_ends_at           timestamptz not null default (now() + interval '14 days'),
  patient_limit           integer not null default 50 check (patient_limit >= 0),
  protocol_limit          integer not null default 3 check (protocol_limit >= 0),
  user_limit              integer not null default 1 check (user_limit >= 1),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table public.organizations is 'Research site / tenant SaaS.';

create index if not exists organizations_stripe_customer_idx
  on public.organizations (stripe_customer_id);

create index if not exists organizations_stripe_subscription_idx
  on public.organizations (stripe_subscription_id);

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- organization_members
-- -----------------------------------------------------------------------------
create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  role            text not null default 'owner'
    check (role in ('owner', 'admin', 'coordinator')),
  created_at      timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists organization_members_user_id_idx
  on public.organization_members (user_id);

-- -----------------------------------------------------------------------------
-- handle_new_user · profile + organization (Fase 1)
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  org_id uuid;
  display_name text;
begin
  display_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(new.email, '@', 1),
    'Mi research site'
  );

  insert into public.profiles (id, email, full_name, plan)
  values (
    new.id,
    new.email,
    display_name,
    'starter'
  )
  on conflict (id) do nothing;

  insert into public.organizations (
    name, plan_id, subscription_status, trial_ends_at,
    patient_limit, protocol_limit, user_limit
  )
  values (
    display_name, 'starter', 'trialing', now() + interval '14 days', 50, 3, 1
  )
  returning id into org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (org_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "organizations_select_member" on public.organizations;
create policy "organizations_select_member"
  on public.organizations for select
  to authenticated
  using (
    id in (
      select organization_id from public.organization_members
      where user_id = auth.uid()
    )
  );

drop policy if exists "organizations_update_owner" on public.organizations;
create policy "organizations_update_owner"
  on public.organizations for update
  to authenticated
  using (
    id in (
      select organization_id from public.organization_members
      where user_id = auth.uid() and role = 'owner'
    )
  )
  with check (
    id in (
      select organization_id from public.organization_members
      where user_id = auth.uid() and role = 'owner'
    )
  );

drop policy if exists "organization_members_select_own" on public.organization_members;
create policy "organization_members_select_own"
  on public.organization_members for select
  to authenticated
  using (user_id = auth.uid());
