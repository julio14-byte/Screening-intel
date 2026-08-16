-- =============================================================================
-- Reafirma políticas RLS de lectura/escritura para datos clínicos (MVP)
-- =============================================================================
-- Ejecutar si la app no muestra pacientes pero existen en Table Editor
-- (p. ej. políticas anon/authenticated faltantes o modificadas en el dashboard).

alter table public.patients enable row level security;
alter table public.clinical_profiles enable row level security;
alter table public.protocols enable row level security;
alter table public.screenings enable row level security;

drop policy if exists "mvp full access patients" on public.patients;
create policy "mvp full access patients"
  on public.patients for all
  to anon, authenticated
  using (true) with check (true);

drop policy if exists "mvp full access clinical_profiles" on public.clinical_profiles;
create policy "mvp full access clinical_profiles"
  on public.clinical_profiles for all
  to anon, authenticated
  using (true) with check (true);

drop policy if exists "mvp full access protocols" on public.protocols;
create policy "mvp full access protocols"
  on public.protocols for all
  to anon, authenticated
  using (true) with check (true);

drop policy if exists "mvp full access screenings" on public.screenings;
create policy "mvp full access screenings"
  on public.screenings for all
  to anon, authenticated
  using (true) with check (true);
