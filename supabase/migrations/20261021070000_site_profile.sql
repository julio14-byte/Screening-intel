-- Datos propios del centro para informes, factibilidad y exportaciones.
-- Tabla aparte de organizations: esa tabla tiene lectura pública para el portal
-- de candidatos y no debe exponer contactos ni la cédula del investigador.

create table if not exists public.site_profiles (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null unique
    references public.organizations (id) on delete cascade,
  site_name           text check (char_length(site_name) <= 160),
  legal_name          text check (char_length(legal_name) <= 200),
  address             text check (char_length(address) <= 300),
  city                text check (char_length(city) <= 100),
  state               text check (char_length(state) <= 100),
  country             text check (char_length(country) <= 100),
  pi_name             text check (char_length(pi_name) <= 160),
  pi_license          text check (char_length(pi_license) <= 60),
  contact_name        text check (char_length(contact_name) <= 160),
  contact_email       text check (char_length(contact_email) <= 320),
  contact_phone       text check (char_length(contact_phone) <= 40),
  ethics_committee    text check (char_length(ethics_committee) <= 200),
  ethics_registration text check (char_length(ethics_registration) <= 80),
  therapeutic_areas   text check (char_length(therapeutic_areas) <= 400),
  facilities          text check (char_length(facilities) <= 1000),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.site_profiles is
  'Identidad del centro de investigación para encabezados de informes y exportaciones.';

drop trigger if exists site_profiles_set_updated_at on public.site_profiles;
create trigger site_profiles_set_updated_at
  before update on public.site_profiles
  for each row execute function public.set_updated_at();

alter table public.site_profiles enable row level security;

drop policy if exists "site_profiles_select_member" on public.site_profiles;
create policy "site_profiles_select_member"
  on public.site_profiles for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "site_profiles_insert_investigator" on public.site_profiles;
create policy "site_profiles_insert_investigator"
  on public.site_profiles for insert to authenticated
  with check (
    public.can_manage_clinical_roles()
    and organization_id in (select public.get_user_organization_ids())
  );

drop policy if exists "site_profiles_update_investigator" on public.site_profiles;
create policy "site_profiles_update_investigator"
  on public.site_profiles for update to authenticated
  using (
    public.can_manage_clinical_roles()
    and organization_id in (select public.get_user_organization_ids())
  )
  with check (
    public.can_manage_clinical_roles()
    and organization_id in (select public.get_user_organization_ids())
  );

revoke all on table public.site_profiles from anon;
revoke all on table public.site_profiles from authenticated;
grant select, insert, update on table public.site_profiles to authenticated;

drop trigger if exists site_profiles_audit_trail on public.site_profiles;
create trigger site_profiles_audit_trail
  after update or delete on public.site_profiles
  for each row execute function audit.capture_row_change();
