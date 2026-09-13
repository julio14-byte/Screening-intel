-- =============================================================================
-- 0021 — Mensajes WhatsApp / SMS a candidatos del portal
-- =============================================================================
-- Corre DESPUÉS de 0020_visits_consent.sql.
-- Bitácora de outreach (append-only). El envío lo hace la API (Twilio).

set statement_timeout = '30s';
set lock_timeout = '8s';

create table if not exists public.candidato_outreach (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  submission_id    uuid not null references public.pre_screen_submissions (id) on delete cascade,
  channel          text not null
    check (channel in ('sms', 'whatsapp', 'whatsapp_link')),
  template_key     text not null
    check (template_key in ('te_llamamos', 'trae_receta', 'link_portal')),
  to_e164          text not null,
  status           text not null
    check (status in ('sent', 'failed', 'opened_link')),
  provider_sid     text,
  error            text,
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now()
);

comment on table public.candidato_outreach is
  'Mensajes SMS/WhatsApp al candidato. Plantillas fijas; no se guarda el briefing de IA.';

create index if not exists candidato_outreach_submission_idx
  on public.candidato_outreach (submission_id, created_at desc);
create index if not exists candidato_outreach_org_idx
  on public.candidato_outreach (organization_id, created_at desc);

alter table public.candidato_outreach enable row level security;
grant select, insert on table public.candidato_outreach to authenticated;

drop policy if exists "tenant_select_candidato_outreach" on public.candidato_outreach;
create policy "tenant_select_candidato_outreach"
  on public.candidato_outreach for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "tenant_insert_candidato_outreach" on public.candidato_outreach;
create policy "tenant_insert_candidato_outreach"
  on public.candidato_outreach for insert to authenticated
  with check (
    (select public.can_write_clinical_data())
    and organization_id in (select public.get_user_organization_ids())
    and submission_id in (
      select s.id
      from public.pre_screen_submissions s
      where s.organization_id = candidato_outreach.organization_id
    )
  );
