-- Quita la conexión con EHR hospitalario (sync, webhooks, secreto).
-- El expediente interno (patients, clinical_profiles, conditions, etc.) se queda.

drop table if exists public.ehr_webhook_events;
drop table if exists public.ehr_sync_logs;

alter table public.organizations
  drop column if exists ehr_webhook_secret,
  drop column if exists ehr_enabled,
  drop column if exists ehr_source;
