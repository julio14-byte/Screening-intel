-- Bitácora de contacto de candidatos del portal: cada intento queda registrado
-- (canal, resultado, próximo intento). Es de solo agregar: no se edita ni se borra
-- para que el historial sirva como evidencia de seguimiento.

create table if not exists public.candidate_contact_attempts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  submission_id   uuid not null
    references public.pre_screen_submissions (id) on delete cascade,
  channel         text not null
    check (channel in ('phone', 'whatsapp', 'sms', 'email', 'in_person')),
  outcome         text not null
    check (outcome in ('reached', 'no_answer', 'voicemail', 'wrong_number', 'declined', 'scheduled')),
  notes           text check (char_length(notes) <= 500),
  next_attempt_on date,
  attempted_at    timestamptz not null default now(),
  attempted_by    uuid default auth.uid() references auth.users (id) on delete set null
);

comment on table public.candidate_contact_attempts is
  'Intentos de contacto a candidatos del portal; bitácora de solo agregar.';

create index if not exists candidate_contact_attempts_submission_idx
  on public.candidate_contact_attempts (submission_id, attempted_at desc);
create index if not exists candidate_contact_attempts_org_idx
  on public.candidate_contact_attempts (organization_id, attempted_at desc);

alter table public.candidate_contact_attempts enable row level security;

drop policy if exists "contact_attempts_select_member" on public.candidate_contact_attempts;
create policy "contact_attempts_select_member"
  on public.candidate_contact_attempts for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "contact_attempts_insert_writer" on public.candidate_contact_attempts;
create policy "contact_attempts_insert_writer"
  on public.candidate_contact_attempts for insert to authenticated
  with check (
    (select public.can_write_clinical_data())
    and organization_id in (select public.get_user_organization_ids())
    and submission_id in (
      select s.id from public.pre_screen_submissions s
      where s.organization_id in (select public.get_user_organization_ids())
    )
  );

revoke all on table public.candidate_contact_attempts from anon;
revoke all on table public.candidate_contact_attempts from authenticated;
grant select, insert on table public.candidate_contact_attempts to authenticated;
