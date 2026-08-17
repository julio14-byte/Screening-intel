-- =============================================================================
-- Fase A: ePRO (formularios de resultados reportados por el paciente)
-- =============================================================================

create table if not exists public.epro_forms (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  protocol_id uuid references public.protocols (id) on delete set null,
  questions   jsonb not null default '[]'::jsonb,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.epro_responses (
  id           uuid primary key default gen_random_uuid(),
  form_id      uuid not null references public.epro_forms (id) on delete cascade,
  patient_id   uuid not null references public.patients (id) on delete cascade,
  answers      jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  constraint epro_responses_form_patient_unique unique (form_id, patient_id)
);

create index if not exists epro_responses_form_id_idx on public.epro_responses (form_id);
create index if not exists epro_responses_patient_id_idx on public.epro_responses (patient_id);

drop trigger if exists epro_forms_set_updated_at on public.epro_forms;
create trigger epro_forms_set_updated_at
  before update on public.epro_forms
  for each row execute function public.set_updated_at();

alter table public.epro_forms enable row level security;
alter table public.epro_responses enable row level security;

drop policy if exists "mvp full access epro_forms" on public.epro_forms;
create policy "mvp full access epro_forms"
  on public.epro_forms for all
  to anon, authenticated
  using (true) with check (true);

drop policy if exists "mvp full access epro_responses" on public.epro_responses;
create policy "mvp full access epro_responses"
  on public.epro_responses for all
  to anon, authenticated
  using (true) with check (true);

-- Formulario demo: síntomas diarios (ePRO básico)
insert into public.epro_forms (id, title, description, questions) values
  (
    '33333333-3333-3333-3333-333333333301',
    'ePRO — Síntomas diarios',
    'Cuestionario breve de resultados reportados por el paciente durante el screening.',
    '[
      {"id": "pain_scale", "type": "scale", "label": "Dolor general (0 = ninguno, 10 = máximo)", "min": 0, "max": 10},
      {"id": "medication_taken", "type": "yesno", "label": "¿Tomó la medicación del estudio hoy?"},
      {"id": "symptoms", "type": "text", "label": "Síntomas nuevos o cambios desde la última visita"},
      {"id": "quality_of_life", "type": "scale", "label": "Calidad de vida hoy (0 = muy mala, 10 = excelente)", "min": 0, "max": 10}
    ]'::jsonb
  )
on conflict (id) do nothing;
