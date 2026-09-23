-- =============================================================================
-- EHR propio centrado en el PACIENTE (HL7 FHIR R4)
-- =============================================================================
-- Adapta patients, clinical_profiles, study_visits, epro_* y ehr_sync_logs.
-- No sustituye el matching: clinical_profiles sigue siendo la proyección
-- que lee el motor de reglas.
--
-- Cumplimiento (diseño, no certificación):
--   • HIPAA: UUID v4 (gen_random_uuid) evita enumerar expedientes;
--     RLS por centro; bitácora append-only; mínimo necesario (sin anon).
--   • NOM-024-SSA3: identificador único por establecimiento, nota clínica
--     con autor/fecha/hora, consentimiento y control de acceso.
-- =============================================================================

set statement_timeout = '60s';
set lock_timeout = '8s';

-- -----------------------------------------------------------------------------
-- Helper: el paciente pertenece al centro del usuario (InitPlan en RLS)
-- -----------------------------------------------------------------------------
create or replace function public.patient_in_user_org(p_patient_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.patients p
    where p.id = p_patient_id
      and p.clinic_id in (select public.get_user_organization_ids())
  );
$$;

revoke all on function public.patient_in_user_org(uuid) from public;
grant execute on function public.patient_in_user_org(uuid) to authenticated;

-- =============================================================================
-- 1) Adaptar patients — FHIR Patient
-- =============================================================================
-- Recurso Patient: identidad demográfica. clinic_id = managingOrganization.
-- ehr_patient_id ya era Identifier.usual del expediente origen.

alter table public.patients
  add column if not exists active boolean not null default true,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists address_line text,
  add column if not exists address_city text,
  add column if not exists address_state text,
  add column if not exists address_postal_code text,
  add column if not exists address_country text not null default 'MX',
  add column if not exists resource_version integer not null default 1,
  add column if not exists updated_at timestamptz not null default now();

comment on table public.patients is
  'FHIR Patient. PK UUID v4. clinic_id es managingOrganization (el site).';
comment on column public.patients.id is
  'UUID v4 (gen_random_uuid). No se usan IDs incrementales para no enumerar PHI.';
comment on column public.patients.clinic_id is
  'FHIR Patient.managingOrganization. Aislamiento tenant / NOM-024.';
comment on column public.patients.ehr_patient_id is
  'FHIR Identifier (use=usual) del expediente origen o del ingreso manual.';
comment on column public.patients.active is
  'FHIR Patient.active. false = expediente inactivo; se conserva por retención.';
comment on column public.patients.resource_version is
  'FHIR Meta.versionId. Sube en cada UPDATE.';
comment on column public.patients.address_country is
  'ISO 3166-1. Default MX (NOM-024).';

create or replace function public.bump_patient_resource_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.resource_version := coalesce(old.resource_version, 1) + 1;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists patients_bump_resource_version on public.patients;
create trigger patients_bump_resource_version
  before update on public.patients
  for each row execute function public.bump_patient_resource_version();

drop trigger if exists patients_set_updated_at on public.patients;

create index if not exists patients_clinic_name_idx
  on public.patients (clinic_id, last_name, first_name);
create index if not exists patients_clinic_birth_idx
  on public.patients (clinic_id, birth_date);

-- =============================================================================
-- 2) patient_identifiers — FHIR Patient.identifier[]
-- =============================================================================
-- CURP, MRN y otros no van en patients para no exponerlos en listados.

create table if not exists public.patient_identifiers (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references public.patients (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  system       text not null,
  value        text not null,
  use          text not null default 'usual'
    check (use in ('usual', 'official', 'temp', 'secondary', 'old')),
  type_code    text not null default 'MR',
  created_at   timestamptz not null default now(),
  constraint patient_identifiers_value_unique unique (organization_id, system, value),
  constraint patient_identifiers_value_not_blank check (length(trim(value)) > 0)
);

comment on table public.patient_identifiers is
  'FHIR Identifier[]. CURP (official), MRN, ID de ingreso. Unicidad por site.';
comment on column public.patient_identifiers.type_code is
  'HL7 Identifier.type: MR (expediente), NI (nacional), PN, etc. CURP = NI.';

create index if not exists patient_identifiers_patient_idx
  on public.patient_identifiers (patient_id);
create index if not exists patient_identifiers_org_type_idx
  on public.patient_identifiers (organization_id, type_code);

-- =============================================================================
-- 3) encounters — FHIR Encounter (consulta / episodio)
-- =============================================================================

create table if not exists public.encounters (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  patient_id       uuid not null references public.patients (id) on delete cascade,
  protocol_id      uuid references public.protocols (id) on delete set null,
  study_visit_id   uuid references public.study_visits (id) on delete set null,
  status           text not null default 'planned'
    check (status in ('planned', 'arrived', 'triaged', 'in-progress', 'onleave', 'finished', 'cancelled', 'unknown')),
  class_code       text not null default 'AMB'
    check (class_code in ('AMB', 'IMP', 'EMER', 'VR', 'HH', 'SS')),
  period_start     timestamptz not null,
  period_end       timestamptz,
  reason_code      text,
  reason_display   text,
  practitioner_user_id uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint encounters_period_ok
    check (period_end is null or period_end >= period_start)
);

comment on table public.encounters is
  'FHIR Encounter. Consulta o visita ligada al Patient. class_code: AMB/IMP/VR/SS.';
comment on column public.encounters.class_code is
  'v3-ActCode: AMB ambulatorio, IMP hospitalizado, VR virtual, SS research/short stay.';

create index if not exists encounters_patient_start_idx
  on public.encounters (patient_id, period_start desc);
create index if not exists encounters_org_start_idx
  on public.encounters (organization_id, period_start desc);
create index if not exists encounters_status_idx
  on public.encounters (organization_id, status);

drop trigger if exists encounters_set_updated_at on public.encounters;
create trigger encounters_set_updated_at
  before update on public.encounters
  for each row execute function public.set_updated_at();

-- study_visits (agenda) se ancla a Encounter cuando hay consulta clínica
alter table public.study_visits
  add column if not exists encounter_id uuid references public.encounters (id) on delete set null,
  add column if not exists class_code text not null default 'SS'
    check (class_code in ('AMB', 'IMP', 'EMER', 'VR', 'HH', 'SS')),
  add column if not exists period_end timestamptz,
  add column if not exists reason_display text;

comment on table public.study_visits is
  'Agenda de pre-screening. Puede apuntar a FHIR Encounter (encounter_id).';

create index if not exists study_visits_patient_when_idx
  on public.study_visits (patient_id, scheduled_at desc);

-- =============================================================================
-- 4) conditions — FHIR Condition (diagnóstico)
-- =============================================================================

create table if not exists public.conditions (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations (id) on delete cascade,
  patient_id          uuid not null references public.patients (id) on delete cascade,
  encounter_id        uuid references public.encounters (id) on delete set null,
  clinical_status     text not null default 'active'
    check (clinical_status in ('active', 'recurrence', 'relapse', 'inactive', 'remission', 'resolved')),
  verification_status text not null default 'confirmed'
    check (verification_status in ('unconfirmed', 'provisional', 'differential', 'confirmed', 'refuted', 'entered-in-error')),
  code_text           text not null,
  code_system         text,
  code_value          text,
  onset_date          date,
  recorded_at         timestamptz not null default now(),
  recorded_by         uuid references auth.users (id) on delete set null,
  source              text not null default 'manual'
    check (source in ('manual', 'ingest', 'epro')),
  note                text not null default '',
  constraint conditions_code_not_blank check (length(trim(code_text)) > 0)
);

comment on table public.conditions is
  'FHIR Condition. Diagnóstico del Patient. code_system típico: ICD-11 MMS.';
comment on column public.conditions.recorded_at is
  'Fecha/hora de registro. Índice para buscar diagnósticos por fecha.';

create index if not exists conditions_patient_recorded_idx
  on public.conditions (patient_id, recorded_at desc);
create index if not exists conditions_patient_status_idx
  on public.conditions (patient_id, clinical_status);
create index if not exists conditions_org_recorded_idx
  on public.conditions (organization_id, recorded_at desc);
create index if not exists conditions_code_idx
  on public.conditions (organization_id, code_value)
  where code_value is not null;

-- =============================================================================
-- 5) medication_statements — FHIR MedicationStatement
-- =============================================================================

create table if not exists public.medication_statements (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  patient_id       uuid not null references public.patients (id) on delete cascade,
  encounter_id     uuid references public.encounters (id) on delete set null,
  status           text not null default 'active'
    check (status in ('active', 'completed', 'entered-in-error', 'intended', 'stopped', 'on-hold', 'unknown', 'not-taken')),
  medication_text  text not null,
  effective_start  date,
  effective_end    date,
  recorded_at      timestamptz not null default now(),
  recorded_by      uuid references auth.users (id) on delete set null,
  source           text not null default 'manual'
    check (source in ('manual', 'ingest', 'epro')),
  note             text not null default '',
  constraint medication_statements_text_not_blank check (length(trim(medication_text)) > 0)
);

comment on table public.medication_statements is
  'FHIR MedicationStatement. Medicación que el paciente toma o tomó.';

create index if not exists medication_statements_patient_idx
  on public.medication_statements (patient_id, status, recorded_at desc);
create index if not exists medication_statements_org_recorded_idx
  on public.medication_statements (organization_id, recorded_at desc);

-- =============================================================================
-- 6) observations — FHIR Observation (labs / signos vitales)
-- =============================================================================

create table if not exists public.observations (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  patient_id       uuid not null references public.patients (id) on delete cascade,
  encounter_id     uuid references public.encounters (id) on delete set null,
  status           text not null default 'final'
    check (status in ('registered', 'preliminary', 'final', 'amended', 'corrected', 'cancelled', 'entered-in-error')),
  category         text not null default 'laboratory'
    check (category in ('laboratory', 'vital-signs', 'survey', 'exam', 'social-history')),
  code_text        text not null,
  code_system      text,
  code_value       text,
  value_quantity   numeric,
  value_unit       text,
  value_string     text,
  effective_at     timestamptz not null default now(),
  issued_at        timestamptz not null default now(),
  recorded_by      uuid references auth.users (id) on delete set null,
  source           text not null default 'manual'
    check (source in ('manual', 'ingest', 'epro')),
  constraint observations_code_not_blank check (length(trim(code_text)) > 0),
  constraint observations_has_value check (
    value_quantity is not null or (value_string is not null and length(trim(value_string)) > 0)
  )
);

comment on table public.observations is
  'FHIR Observation. Labs y vitales. Se conservan históricos (no se pisan).';
comment on column public.observations.effective_at is
  'FHIR Observation.effectiveDateTime. Índice por paciente + fecha.';

create index if not exists observations_patient_effective_idx
  on public.observations (patient_id, effective_at desc);
create index if not exists observations_patient_code_idx
  on public.observations (patient_id, code_text, effective_at desc);
create index if not exists observations_org_effective_idx
  on public.observations (organization_id, effective_at desc);

-- =============================================================================
-- 7) allergy_intolerances — FHIR AllergyIntolerance (seguridad del paciente)
-- =============================================================================

create table if not exists public.allergy_intolerances (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations (id) on delete cascade,
  patient_id          uuid not null references public.patients (id) on delete cascade,
  encounter_id        uuid references public.encounters (id) on delete set null,
  clinical_status     text not null default 'active'
    check (clinical_status in ('active', 'inactive', 'resolved')),
  verification_status text not null default 'unconfirmed'
    check (verification_status in ('unconfirmed', 'presumed', 'confirmed', 'refuted', 'entered-in-error')),
  type                text not null default 'allergy'
    check (type in ('allergy', 'intolerance')),
  category            text
    check (category is null or category in ('food', 'medication', 'environment', 'biologic')),
  criticality         text
    check (criticality is null or criticality in ('low', 'high', 'unable-to-assess')),
  code_text           text not null,
  onset_date          date,
  recorded_at         timestamptz not null default now(),
  recorded_by         uuid references auth.users (id) on delete set null,
  reaction_note       text not null default '',
  constraint allergy_intolerances_code_not_blank check (length(trim(code_text)) > 0)
);

comment on table public.allergy_intolerances is
  'FHIR AllergyIntolerance. Crítico para no prescribir un alérgeno (NOM-024 / HIPAA).';

create index if not exists allergy_intolerances_patient_idx
  on public.allergy_intolerances (patient_id, clinical_status);

-- =============================================================================
-- 8) procedures — FHIR Procedure
-- =============================================================================

create table if not exists public.procedures (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  patient_id       uuid not null references public.patients (id) on delete cascade,
  encounter_id     uuid references public.encounters (id) on delete set null,
  status           text not null default 'completed'
    check (status in ('preparation', 'in-progress', 'not-done', 'on-hold', 'stopped', 'completed', 'entered-in-error', 'unknown')),
  code_text        text not null,
  code_system      text,
  code_value       text,
  performed_at     timestamptz not null default now(),
  recorded_by      uuid references auth.users (id) on delete set null,
  note             text not null default '',
  constraint procedures_code_not_blank check (length(trim(code_text)) > 0)
);

comment on table public.procedures is
  'FHIR Procedure. Intervenciones o procedimientos realizados al Patient.';

create index if not exists procedures_patient_when_idx
  on public.procedures (patient_id, performed_at desc);

-- =============================================================================
-- 9) clinical_documents — FHIR Composition / DocumentReference (nota NOM-024)
-- =============================================================================

create table if not exists public.clinical_documents (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  patient_id       uuid not null references public.patients (id) on delete cascade,
  encounter_id     uuid references public.encounters (id) on delete set null,
  document_type    text not null default 'progress-note'
    check (document_type in ('progress-note', 'history', 'discharge', 'consent-attachment', 'other')),
  status           text not null default 'final'
    check (status in ('preliminary', 'final', 'amended', 'entered-in-error')),
  title            text not null,
  content_text     text not null,
  confidentiality  text not null default 'N'
    check (confidentiality in ('U', 'L', 'M', 'N', 'R', 'V')),
  authored_at      timestamptz not null default now(),
  author_id        uuid not null references auth.users (id) on delete restrict,
  created_at       timestamptz not null default now(),
  constraint clinical_documents_title_not_blank check (length(trim(title)) > 0),
  constraint clinical_documents_body_not_blank check (length(trim(content_text)) > 0)
);

comment on table public.clinical_documents is
  'FHIR Composition. Nota clínica NOM-024: autor, fecha/hora, paciente y texto.';
comment on column public.clinical_documents.confidentiality is
  'v3 Confidentiality: N normal, R restricted, V very restricted.';
comment on column public.clinical_documents.author_id is
  'Quién firmó la nota. NOT NULL — la NOM exige identificación del profesional.';

create index if not exists clinical_documents_patient_authored_idx
  on public.clinical_documents (patient_id, authored_at desc);
create index if not exists clinical_documents_org_authored_idx
  on public.clinical_documents (organization_id, authored_at desc);

-- =============================================================================
-- 10) consents — FHIR Consent (aviso de privacidad / ICF / HIPAA notice)
-- =============================================================================

create table if not exists public.consents (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  patient_id       uuid not null references public.patients (id) on delete cascade,
  status           text not null default 'active'
    check (status in ('draft', 'proposed', 'active', 'rejected', 'inactive', 'entered-in-error')),
  scope            text not null
    check (scope in ('treatment', 'research', 'privacy')),
  category         text not null
    check (category in ('hipaa-notice', 'nom-024', 'icf', 'other')),
  period_start     date not null default current_date,
  period_end       date,
  granted_at       timestamptz not null default now(),
  granted_by_name  text not null,
  policy_text      text not null default '',
  source_document_id uuid references public.clinical_documents (id) on delete set null,
  recorded_by      uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  constraint consents_grantor_not_blank check (length(trim(granted_by_name)) > 0),
  constraint consents_period_ok check (period_end is null or period_end >= period_start)
);

comment on table public.consents is
  'FHIR Consent. Aviso NOM-024, notice HIPAA o ICF del site (el ICF no lo inventa la app).';

create index if not exists consents_patient_status_idx
  on public.consents (patient_id, status, period_start desc);
create index if not exists consents_org_category_idx
  on public.consents (organization_id, category, status);

-- =============================================================================
-- 11) Adaptar clinical_profiles — proyección para matching (no es recurso FHIR)
-- =============================================================================

alter table public.clinical_profiles
  add column if not exists reconciled_at timestamptz,
  add column if not exists source_encounter_id uuid references public.encounters (id) on delete set null;

comment on table public.clinical_profiles is
  'Proyección denormalizada para el motor de matching. La fuente de verdad FHIR son conditions, medication_statements y observations.';
comment on column public.clinical_profiles.reconciled_at is
  'Última vez que se reconstruyó desde las tablas FHIR.';

-- =============================================================================
-- 12) Adaptar ePRO — FHIR Questionnaire / QuestionnaireResponse
-- =============================================================================

alter table public.epro_forms
  add column if not exists fhir_status text not null default 'active'
    check (fhir_status in ('draft', 'active', 'retired', 'unknown'));

alter table public.epro_responses
  add column if not exists status text not null default 'completed'
    check (status in ('in-progress', 'completed', 'amended', 'entered-in-error', 'stopped')),
  add column if not exists authored_at timestamptz not null default now();

comment on table public.epro_forms is
  'FHIR Questionnaire. Instrumento ePRO ligado opcionalmente a un protocolo.';
comment on table public.epro_responses is
  'FHIR QuestionnaireResponse. Respuestas del Patient a un Questionnaire.';

create index if not exists epro_responses_patient_authored_idx
  on public.epro_responses (patient_id, authored_at desc);

-- =============================================================================
-- 13) Adaptar ehr_sync_logs — FHIR Provenance del ingreso
-- =============================================================================

comment on table public.ehr_sync_logs is
  'FHIR Provenance del ingreso de Patient (lote). Quién cargó qué y con qué resultado.';

-- =============================================================================
-- 14) RLS — tablas nuevas (revoke anon + tenant + can_write)
-- =============================================================================
-- Grants y policies por separado: una policy no quita el GRANT de anon.

do $$
declare
  t text;
begin
  foreach t in array array[
    'patient_identifiers',
    'encounters',
    'conditions',
    'medication_statements',
    'observations',
    'allergy_intolerances',
    'procedures',
    'clinical_documents',
    'consents'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon', t);
    execute format('revoke all on table public.%I from public', t);
    execute format(
      'grant select, insert, update on table public.%I to authenticated',
      t
    );
  end loop;
end;
$$;

-- Sin DELETE para authenticated: retención HIPAA/NOM. Borrado solo service_role.

create or replace function public.ehr_org_visible(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_org_id in (select public.get_user_organization_ids());
$$;

revoke all on function public.ehr_org_visible(uuid) from public;
grant execute on function public.ehr_org_visible(uuid) to authenticated;

do $$
declare
  t text;
  pol text;
begin
  foreach t in array array[
    'patient_identifiers',
    'encounters',
    'conditions',
    'medication_statements',
    'observations',
    'allergy_intolerances',
    'procedures',
    'clinical_documents',
    'consents'
  ]
  loop
    pol := t || '_select';
    execute format('drop policy if exists %I on public.%I', pol, t);
    execute format(
      'create policy %I on public.%I for select to authenticated
       using ((select public.ehr_org_visible(organization_id)))',
      pol, t
    );

    pol := t || '_insert';
    execute format('drop policy if exists %I on public.%I', pol, t);
    execute format(
      'create policy %I on public.%I for insert to authenticated
       with check (
         (select public.can_write_clinical_data())
         and (select public.ehr_org_visible(organization_id))
         and (select public.patient_in_user_org(patient_id))
       )',
      pol, t
    );

    pol := t || '_update';
    execute format('drop policy if exists %I on public.%I', pol, t);
    execute format(
      'create policy %I on public.%I for update to authenticated
       using (
         (select public.can_write_clinical_data())
         and (select public.ehr_org_visible(organization_id))
       )
       with check (
         (select public.can_write_clinical_data())
         and (select public.ehr_org_visible(organization_id))
         and (select public.patient_in_user_org(patient_id))
       )',
      pol, t
    );
  end loop;
end;
$$;

-- Nota clínica: UPDATE exige SELECT (RLS). author_id no se reasigna en with check extra.

-- =============================================================================
-- 15) Bitácora (AuditEvent) en recursos clínicos sensibles
-- =============================================================================

drop trigger if exists conditions_audit_trail on public.conditions;
create trigger conditions_audit_trail
  after update or delete on public.conditions
  for each row execute function audit.capture_row_change();

drop trigger if exists observations_audit_trail on public.observations;
create trigger observations_audit_trail
  after update or delete on public.observations
  for each row execute function audit.capture_row_change();

drop trigger if exists consents_audit_trail on public.consents;
create trigger consents_audit_trail
  after update or delete on public.consents
  for each row execute function audit.capture_row_change();

drop trigger if exists clinical_documents_audit_trail on public.clinical_documents;
create trigger clinical_documents_audit_trail
  after update or delete on public.clinical_documents
  for each row execute function audit.capture_row_change();

drop trigger if exists allergy_intolerances_audit_trail on public.allergy_intolerances;
create trigger allergy_intolerances_audit_trail
  after update or delete on public.allergy_intolerances
  for each row execute function audit.capture_row_change();

drop trigger if exists patient_identifiers_audit_trail on public.patient_identifiers;
create trigger patient_identifiers_audit_trail
  after update or delete on public.patient_identifiers
  for each row execute function audit.capture_row_change();
