-- Control de visitas paciente–médico: tipo, médico y notas clínicas.
-- Reusa study_visits (agenda). No borra visitas existentes.

set statement_timeout = '30s';
set lock_timeout = '8s';

alter table public.study_visits
  add column if not exists kind text not null default 'consulta',
  add column if not exists clinician_name text not null default '';

alter table public.study_visits
  drop constraint if exists study_visits_kind_check;

alter table public.study_visits
  add constraint study_visits_kind_check
  check (kind in ('consulta', 'pre_screening', 'screening', 'follow_up'));

comment on table public.study_visits is
  'Control de visitas del paciente con el médico. Fecha, tipo, estado y notas clínicas.';
comment on column public.study_visits.notes is
  'Nota clínica de la visita. Coordinador o médico.';
comment on column public.study_visits.clinician_name is
  'Nombre del médico o investigador que atiende.';
comment on column public.study_visits.kind is
  'consulta | pre_screening | screening | follow_up';
