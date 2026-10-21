import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { screeningsToCsv } from "../src/lib/export/dashboardCsv";
import {
  emptySiteProfile,
  hasSiteIdentity,
  siteFileSlug,
  siteHeaderRows,
  siteProfileFromRow,
  siteProfileSchema,
  type SiteProfile,
} from "../src/lib/site/profile";
import type { ScreeningWithRelations } from "../src/lib/types";

const read = (path: string) => readFileSync(resolve(path), "utf8");
const migration = read("supabase/migrations/20261021070000_site_profile.sql");
const report = read("src/components/protocols/FeasibilityReport.tsx");
const matchPage = read("src/app/(app)/protocols/[id]/match/page.tsx");
const dashboard = read("src/components/dashboard/DashboardView.tsx");
const api = read("src/app/api/settings/site/route.ts");
const permissions = read("src/lib/rbac/permissions.ts");

let failed = 0;
function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

const site: SiteProfile = {
  ...emptySiteProfile(),
  site_name: "Centro Clínico Reforma",
  legal_name: "Reforma Investigación S.A. de C.V.",
  city: "Ciudad de México",
  country: "México",
  pi_name: "Dra. Ana Soto",
  pi_license: "1234567",
  contact_email: "estudios@reforma.mx",
  ethics_committee: "CEI Reforma",
  ethics_registration: "CONBIOETICA-09-CEI-001",
};

assert(hasSiteIdentity(site) && !hasSiteIdentity(emptySiteProfile()), "identidad solo con nombre o razón social");
assert(siteProfileFromRow(null).site_name === "", "sin fila devuelve un perfil vacío");
assert(siteProfileFromRow({ site_name: "  Centro  " }).site_name === "Centro", "recorta espacios");

const rows = siteHeaderRows(site);
assert(rows.some((r) => r.label === "Investigador principal" && r.value.includes("Cédula 1234567")), "encabezado incluye PI y cédula");
assert(rows.some((r) => r.label === "Comité de ética" && r.value.includes("CONBIOETICA")), "encabezado incluye comité de ética");
assert(!rows.some((r) => r.label === "Infraestructura"), "omite los campos vacíos");

assert(siteProfileSchema.safeParse({ ...emptySiteProfile(), contact_email: "no-es-correo" }).success === false, "rechaza correo inválido");
assert(siteProfileSchema.safeParse({ ...emptySiteProfile(), site_name: "x".repeat(161) }).success === false, "rechaza nombre demasiado largo");
assert(siteProfileSchema.safeParse(site).success, "acepta un perfil completo");
assert(siteFileSlug(site) === "centro-clinico-reforma", "slug de archivo sin acentos");
assert(siteFileSlug(null) === "", "sin sitio no hay slug");

const screening = {
  id: "s1",
  status: "pre_screening",
  match_score: 80,
  updated_at: "2026-10-21T10:00:00Z",
  patients: { first_name: "Luz", last_name: "Mora", subject_code: "S-001" },
  protocols: { code_name: "ABC-1", title: "Estudio" },
} as unknown as ScreeningWithRelations;
const day = new Date("2026-10-21T12:00:00Z");
const withSite = screeningsToCsv([screening], site, day).split("\n");
assert(withSite[0].startsWith("sitio,investigador_principal,fecha_reporte,sujeto"), "CSV con sitio agrega columnas al inicio");
assert(withSite[1].startsWith("Centro Clínico Reforma,Dra. Ana Soto,2026-10-21,"), "CSV lleva sitio, PI y fecha en cada fila");
const without = screeningsToCsv([screening], null, day).split("\n");
assert(without[0].startsWith("sujeto,"), "CSV sin perfil conserva el formato anterior");

assert(migration.includes("enable row level security"), "site_profiles con RLS");
assert(migration.includes("revoke all on table public.site_profiles from anon"), "site_profiles sin acceso anónimo");
assert(migration.includes("can_manage_clinical_roles()"), "solo el investigador edita");
assert(migration.includes("audit.capture_row_change()"), "cambios auditados");
assert(!/alter table public\.organizations/i.test(migration), "no agrega columnas a organizations (lectura pública del portal)");

assert(api.includes('requirePermission("roles:manage")'), "la API exige permiso para guardar");
assert(api.includes("organization_id: gate.organizationId"), "la API fija la organización desde la sesión");
assert(permissions.includes('"/api/settings/site"'), "monitor no puede escribir el perfil");
assert(report.includes("siteHeaderRows") && report.includes("siteDisplayName"), "el informe de factibilidad muestra los datos del centro");
assert(matchPage.includes("useSiteProfile") && matchPage.includes("site={site}"), "la pantalla de matching pasa el perfil al informe");
assert(dashboard.includes("screeningsToCsv(filteredRows, site)"), "la exportación del dashboard lleva el perfil");
assert(!report.includes("contact_email") || report.includes("siteHeaderRows"), "el informe no lee campos sueltos de contacto");

if (failed) process.exit(1);
console.log("verify-site-profile: datos del centro en informe y exportaciones OK");
