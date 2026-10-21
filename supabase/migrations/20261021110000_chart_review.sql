-- Revisión de expediente con evidencia trazable.
--  * criterion_reviews: decisión por criterio (de solo agregar) con fuente, fecha del dato,
--    valor en el documento fuente, revisor y rol al momento de revisar.
--  * patient_medications: conciliación farmacológica estructurada (dosis, inicio, fin, fuente).
-- Quien revisa no decide la elegibilidad: la decisión final sigue siendo del investigador.

create table if not exists public.criterion_reviews (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  patient_id      uuid not null
    references public.patients (id) on delete cascade,
  protocol_id     uuid not null
    references public.protocols (id) on delete cascade,
  criterion       text not null check (char_length(criterion) between 1 and 300),
  criterion_type  text not null check (criterion_type in ('inclusion', 'exclusion')),
  engine_status   text not null check (engine_status in ('pass', 'fail', 'missing')),
  engine_evidence text[] not null default '{}'
    check (cardinality(engine_evidence) <= 10),
  decision        text not null
    check (decision in ('confirmed', 'rejected', 'clarify')),
  source_type     text
    check (source_type in ('visit_note', 'lab_report', 'referral', 'edc_import',
                           'patient_interview', 'other')),
  source_ref      text check (char_length(source_ref) <= 200),
  observed_on     date,
  source_value    text check (char_length(source_value) <= 60),
  note            text check (char_length(note) <= 500),
  reviewer_id     uuid default auth.uid() references auth.users (id) on delete set null,
  reviewer_role   text default (public.get_user_app_role())::text,
  reviewed_at     timestamptz not null default now(),
  -- Una decisión firme exige poder rastrear de dónde salió el dato.
  constraint criterion_reviews_traceable_check check (
    decision = 'clarify'
    or (source_type is not null and source_ref is not null and observed_on is not null)
  ),
  constraint criterion_reviews_clarify_note_check check (
    decision <> 'clarify' or char_length(coalesce(note, '')) >= 3
  )
);

comment on table public.criterion_reviews is
  'Revisión humana por criterio de protocolo; bitácora de solo agregar.';

create index if not exists criterion_reviews_patient_protocol_idx
  on public.criterion_reviews (patient_id, protocol_id, reviewed_at desc);
create index if not exists criterion_reviews_org_idx
  on public.criterion_reviews (organization_id, reviewed_at desc);

create table if not exists public.patient_medications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations (id) on delete cascade,
  patient_id      uuid not null
    references public.patients (id) on delete cascade,
  drug_name       text not null check (char_length(drug_name) between 2 and 160),
  dose            text check (char_length(dose) <= 80),
  started_on      date,
  ended_on        date,
  source_type     text not null default 'other'
    check (source_type in ('visit_note', 'lab_report', 'referral', 'edc_import',
                           'patient_interview', 'pharmacy_record', 'other')),
  source_ref      text check (char_length(source_ref) <= 200),
  verified_on     date,
  recorded_by     uuid default auth.uid() references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint patient_medications_window_check
    check (started_on is null or ended_on is null or ended_on >= started_on)
);

comment on table public.patient_medications is
  'Medicación conciliada del paciente con fuente, vigencia y última verificación.';

create index if not exists patient_medications_patient_idx
  on public.patient_medications (patient_id, ended_on);
create index if not exists patient_medications_org_idx
  on public.patient_medications (organization_id);

drop trigger if exists patient_medications_set_updated_at on public.patient_medications;
create trigger patient_medications_set_updated_at
  before update on public.patient_medications
  for each row execute function public.set_updated_at();

alter table public.criterion_reviews enable row level security;
alter table public.patient_medications enable row level security;

drop policy if exists "criterion_reviews_select_member" on public.criterion_reviews;
create policy "criterion_reviews_select_member"
  on public.criterion_reviews for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "criterion_reviews_insert_writer" on public.criterion_reviews;
create policy "criterion_reviews_insert_writer"
  on public.criterion_reviews for insert to authenticated
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
  );

drop policy if exists "patient_medications_select_member" on public.patient_medications;
create policy "patient_medications_select_member"
  on public.patient_medications for select to authenticated
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "patient_medications_insert_writer" on public.patient_medications;
create policy "patient_medications_insert_writer"
  on public.patient_medications for insert to authenticated
  with check (
    (select public.can_write_clinical_data())
    and organization_id in (select public.get_user_organization_ids())
    and patient_id in (
      select p.id from public.patients p
      where p.clinic_id in (select public.get_user_organization_ids())
    )
  );

drop policy if exists "patient_medications_update_writer" on public.patient_medications;
create policy "patient_medications_update_writer"
  on public.patient_medications for update to authenticated
  using (
    (select public.can_write_clinical_data())
    and organization_id in (select public.get_user_organization_ids())
  )
  with check (
    (select public.can_write_clinical_data())
    and organization_id in (select public.get_user_organization_ids())
  );

revoke all on table public.criterion_reviews from anon;
revoke all on table public.criterion_reviews from authenticated;
grant select, insert on table public.criterion_reviews to authenticated;

-- La medicación se corrige solo en vigencia y verificación; el resto es registro.
revoke all on table public.patient_medications from anon;
revoke all on table public.patient_medications from authenticated;
grant select, insert on table public.patient_medications to authenticated;
grant update (ended_on, verified_on, dose, source_ref) on table public.patient_medications to authenticated;

drop trigger if exists patient_medications_audit_trail on public.patient_medications;
create trigger patient_medications_audit_trail
  after update or delete on public.patient_medications
  for each row execute function audit.capture_row_change();
