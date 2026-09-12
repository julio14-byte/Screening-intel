-- =============================================================================
-- Sub-investigador — PASO 1: agregar valor al enum
-- =============================================================================
-- Ejecutar después de 0007_rbac.sql
-- IMPORTANTE: en el SQL Editor de Supabase, ejecuta SOLO este archivo primero.
-- Luego ejecuta 0012_sub_investigator_rbac.sql (PostgreSQL exige commit del enum).

do $$
begin
  alter type public.app_role add value 'sub_investigator';
exception
  when duplicate_object then null;
end $$;
