-- =============================================================================
-- Portal /candidato: GRANT SELECT a anon + políticas (tras 0008 tenant RLS)
-- =============================================================================
-- Si aplicaste 0008_security_tenant_rls.sql, anon perdió acceso a protocols.
-- Ejecutar después de 0009 y 0013 (o si ves "permission denied for table protocols").

grant select on table public.organizations to anon;
grant select on table public.protocols to anon;

-- Lectura pública de orgs con portal activo
drop policy if exists "organizations_select_portal_public" on public.organizations;
create policy "organizations_select_portal_public"
  on public.organizations for select
  to anon, authenticated
  using (portal_enabled = true);

-- Protocolos activos de centros con portal activo
drop policy if exists "protocols_select_portal_public" on public.protocols;
create policy "protocols_select_portal_public"
  on public.protocols for select
  to anon, authenticated
  using (
    status = 'active'::public.protocol_status
    and exists (
      select 1
      from public.organizations o
      where o.portal_enabled = true
        and o.id = protocols.clinic_id
    )
  );

-- App autenticada: asegurar SELECT si solo existen políticas tenant (0008)
drop policy if exists "clinical_select_protocols" on public.protocols;
create policy "clinical_select_protocols"
  on public.protocols for select
  to authenticated
  using (true);

-- Alinear protocolos MVP huérfanos con la org más antigua (single-site)
update public.protocols pr
set clinic_id = sub.org_id
from (
  select id as org_id
  from public.organizations
  order by created_at
  limit 1
) sub
where pr.clinic_id = '00000000-0000-0000-0000-000000000001'::uuid
  and sub.org_id is not null
  and pr.clinic_id is distinct from sub.org_id;
