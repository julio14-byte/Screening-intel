-- =============================================================================
-- Requiere sesión (Supabase Auth) para acceder a los datos
-- =============================================================================
-- Ejecutar después de 0001_initial_schema.sql, una vez que el login esté
-- desplegado. Reemplaza las políticas permisivas del MVP (rol anon) por
-- políticas que solo permiten acceso a usuarios autenticados.

drop policy if exists "mvp full access patients" on public.patients;
drop policy if exists "mvp full access clinical_profiles" on public.clinical_profiles;
drop policy if exists "mvp full access protocols" on public.protocols;
drop policy if exists "mvp full access screenings" on public.screenings;

create policy "authenticated full access patients"
  on public.patients for all
  to authenticated
  using (true) with check (true);

create policy "authenticated full access clinical_profiles"
  on public.clinical_profiles for all
  to authenticated
  using (true) with check (true);

create policy "authenticated full access protocols"
  on public.protocols for all
  to authenticated
  using (true) with check (true);

create policy "authenticated full access screenings"
  on public.screenings for all
  to authenticated
  using (true) with check (true);

-- Próximo paso (multi-clínica): filtrar por clinic_id usando app_metadata
-- del JWT, p. ej.:
--   using (clinic_id = (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid)
