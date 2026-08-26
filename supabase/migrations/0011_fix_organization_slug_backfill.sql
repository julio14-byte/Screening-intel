-- =============================================================================
-- Reparación: slugs duplicados en organizations (error 23505 slug=demo)
-- =============================================================================
-- Ejecutar si 0009_patient_portal.sql falló en el backfill de slug.
-- Idempotente: solo asigna slug a orgs sin slug válido.

alter table public.organizations
  add column if not exists portal_enabled boolean not null default false;

with candidates as (
  select
    id,
    coalesce(
      nullif(
        lower(
          trim(
            both '-' from regexp_replace(coalesce(name, 'site'), '[^a-zA-Z0-9]+', '-', 'g')
          )
        ),
        ''
      ),
      'site'
    ) as base_slug
  from public.organizations
  where slug is null or trim(slug) = ''
),
ranked as (
  select
    c.id,
    c.base_slug,
    row_number() over (partition by c.base_slug order by c.id) as rn,
    exists (
      select 1
      from public.organizations o2
      where o2.slug = c.base_slug
        and o2.id <> c.id
    ) as slug_taken
  from candidates c
),
resolved as (
  select
    id,
    case
      when rn = 1 and not slug_taken then base_slug
      else base_slug || '-' || left(id::text, 8)
    end as new_slug
  from ranked
)
update public.organizations o
set slug = r.new_slug
from resolved r
where o.id = r.id;

update public.organizations
set slug = 'site-' || left(id::text, 8)
where slug is null or trim(slug) = '';

-- Resto de 0009 si aún no existe la tabla de submissions
create table if not exists public.pre_screen_submissions (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations (id) on delete cascade,
  protocol_id         uuid references public.protocols (id) on delete set null,
  status              text not null default 'pending'
    check (status in ('pending', 'converted', 'archived')),
  referral_code       text not null unique,
  first_name          text not null,
  last_name           text not null,
  birth_date          date not null,
  gender              public.gender_type not null,
  contact_email       text,
  contact_phone       text,
  raw_notes           text,
  extracted_profile   jsonb not null default '{}',
  match_results       jsonb not null default '[]',
  consent_at          timestamptz not null,
  converted_patient_id uuid references public.patients (id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists pre_screen_submissions_org_idx
  on public.pre_screen_submissions (organization_id, status, created_at desc);

create index if not exists pre_screen_submissions_referral_idx
  on public.pre_screen_submissions (referral_code);

comment on table public.pre_screen_submissions is
  'Leads del portal público /candidato antes de convertir a patients.';

alter table public.pre_screen_submissions enable row level security;

drop policy if exists "tenant_select_pre_screen" on public.pre_screen_submissions;
create policy "tenant_select_pre_screen"
  on public.pre_screen_submissions for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = pre_screen_submissions.organization_id
        and om.user_id = auth.uid()
    )
  );

drop policy if exists "tenant_update_pre_screen" on public.pre_screen_submissions;
create policy "tenant_update_pre_screen"
  on public.pre_screen_submissions for update
  to authenticated
  using (
    public.can_write_clinical_data()
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id = pre_screen_submissions.organization_id
        and om.user_id = auth.uid()
    )
  )
  with check (
    public.can_write_clinical_data()
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id = pre_screen_submissions.organization_id
        and om.user_id = auth.uid()
    )
  );
