-- Revisión del diario del paciente en la visita.
-- El diario vive en el sistema del patrocinador (p. ej. Veeva); Crisvia NO es su sistema fuente.
-- Aquí el sitio registra lo que revisó con el paciente: periodo, días esperados y completados,
-- dosis omitidas, posibles eventos adversos, medicación nueva y la referencia a la fuente.
-- Bitácora de solo agregar: una corrección se registra como una revisión nueva.

create table if not exists public.diary_reviews (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null
    references public.organizations (id) on delete cascade,
  patient_id           uuid not null
    references public.patients (id) on delete cascade,
  protocol_id          uuid not null
    references public.protocols (id) on delete cascade,
  visit_id             uuid
    references public.follow_up_visits (id) on delete set null,
  source_system        text not null
    check (source_system in ('veeva', 'other_ediary', 'paper_diary')),
  source_ref           text not null
    check (char_length(btrim(source_ref)) between 1 and 200),
  period_start         date not null,
  period_end           date not null,
  expected_days        integer not null check (expected_days between 1 and 366),
  completed_days       integer not null check (completed_days >= 0),
  missed_doses         integer not null default 0 check (missed_doses between 0 and 999),
  possible_ae          boolean not null default false,
  ae_note              text check (char_length(ae_note) <= 500),
  new_medications      boolean not null default false,
  new_medications_note text check (char_length(new_medications_note) <= 500),
  note                 text check (char_length(note) <= 500),
  reviewer_id          uuid default auth.uid() references auth.users (id) on delete set null,
  reviewer_role        text default (public.get_user_app_role())::text,
  reviewed_at          timestamptz not null default now(),
  constraint diary_reviews_period_check check (period_end >= period_start),
  constraint diary_reviews_days_check check (
    completed_days <= expected_days
    and expected_days <= (period_end - period_start) + 1
  ),
  constraint diary_reviews_ae_described_check check (
    possible_ae = false or char_length(btrim(coalesce(ae_note, ''))) >= 3
  ),
  constraint diary_reviews_meds_described_check check (
    new_medications = false or char_length(btrim(coalesce(new_medications_note, ''))) >= 3
  )
);

comment on table public.diary_reviews is
  'Revisión del diario del paciente hecha por el sitio en la visita; el diario fuente vive en el sistema del patrocinador.';

create index if not exists diary_reviews_patient_idx
  on public.diary_reviews (patient_id, reviewed_at desc);
create index if not exists diary_reviews_visit_idx
  on public.diary_reviews (visit_id) where visit_id is not null;
create index if not exists diary_reviews_org_idx
  on public.diary_reviews (organization_id, reviewed_at desc);

alter table public.diary_reviews enable row level security;

drop policy if exists "diary_reviews_select_member" on public.diary_reviews;
create policy "diary_reviews_select_member"
  on public.diary_reviews for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "diary_reviews_insert_writer" on public.diary_reviews;
create policy "diary_reviews_insert_writer"
  on public.diary_reviews for insert to authenticated
  with check (
    (select public.can_write_clinical_data())
    and organization_id in (select public.get_user_organization_ids())
    and patient_id in (
      select p.id from public.patients p
      where p.clinic_id in (select public.get_user_organization_ids())
    )
    and protocol_id in (
      select pr.id from public.protocols pr
      where pr.clinic_id in (select public.get_user_organization_ids())
    )
    and (
      visit_id is null
      or exists (
        select 1 from public.follow_up_visits v
        where v.id = diary_reviews.visit_id
          and v.patient_id = diary_reviews.patient_id
          and v.protocol_id = diary_reviews.protocol_id
          and v.organization_id = diary_reviews.organization_id
      )
    )
  );

revoke all on table public.diary_reviews from anon;
revoke all on table public.diary_reviews from authenticated;
grant select, insert on table public.diary_reviews to authenticated;
