-- =============================================================================
-- Portal de candidatos (pre-screen público) — rutas en español /candidato/*
-- =============================================================================
-- Ejecutar después de 0007_rbac.sql (y 0008 si aplica tenant RLS)

alter table public.organizations
  add column if not exists portal_enabled boolean not null default false;

comment on column public.organizations.portal_enabled is
  'Si true, el link público /candidato/[slug] acepta envíos de candidatos.';

-- Backfill slug desde nombre para orgs sin slug
update public.organizations o
set slug = lower(
  trim(both '-' from regexp_replace(
    coalesce(o.name, 'site'),
  '[^a-zA-Z0-9]+', '-', 'g'
  ))
)
where o.slug is null or trim(o.slug) = '';

-- Evitar slugs vacíos
update public.organizations
set slug = 'site-' || left(id::text, 8)
where slug is null or trim(slug) = '';

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

-- Inserción pública solo vía service role en API
