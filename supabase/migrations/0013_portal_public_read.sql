-- =============================================================================
-- Portal público /candidato — lectura anon + update portal por investigator
-- =============================================================================

-- Anon/authenticated pueden leer orgs con portal activo (solo para formulario público)
drop policy if exists "organizations_select_portal_public" on public.organizations;
create policy "organizations_select_portal_public"
  on public.organizations for select
  to anon, authenticated
  using (portal_enabled = true);

-- Protocolos activos visibles en portal público
drop policy if exists "protocols_select_portal_public" on public.protocols;
create policy "protocols_select_portal_public"
  on public.protocols for select
  to anon, authenticated
  using (
    status = 'active'::public.protocol_status
    and exists (
      select 1
      from public.organizations o
      where o.id = protocols.clinic_id
        and o.portal_enabled = true
    )
  );

-- Investigator puede actualizar portal (slug, portal_enabled) de su org
drop policy if exists "organizations_update_portal_investigator" on public.organizations;
create policy "organizations_update_portal_investigator"
  on public.organizations for update
  to authenticated
  using (
    public.can_manage_clinical_roles()
    and id in (
      select organization_id
      from public.organization_members
      where user_id = auth.uid()
    )
  )
  with check (
    public.can_manage_clinical_roles()
    and id in (
      select organization_id
      from public.organization_members
      where user_id = auth.uid()
    )
  );
