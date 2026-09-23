-- Quita el agente de cola (chat) y el vínculo de paciente a un EHR externo.
-- El expediente interno y patient_identifiers se quedan.

drop table if exists public.ai_messages;
drop table if exists public.ai_conversations;

drop index if exists public.patients_clinic_ehr_id_unique;
drop index if exists public.patients_ehr_last_synced_idx;

alter table public.patients
  drop column if exists ehr_patient_id,
  drop column if exists ehr_source,
  drop column if exists ehr_last_synced_at;
