-- Anamnesis en el perfil clínico: diagnósticos con fecha/gravedad,
-- cirugías, hospitalizaciones, medicación con dosis y alergias.
-- conditions[] y medications[] siguen siendo la proyección para matching.

set statement_timeout = '30s';
set lock_timeout = '8s';

alter table public.clinical_profiles
  add column if not exists anamnesis jsonb not null default '{}'::jsonb;

comment on column public.clinical_profiles.anamnesis is
  'Historial médico (anamnesis): diagnósticos (fecha, síntomas, gravedad, evolución), cirugías, hospitalizaciones, fármacos con dosis/horario y alergias.';

notify pgrst, 'reload schema';
