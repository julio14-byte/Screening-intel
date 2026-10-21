import { z } from "zod";

export const SITE_PROFILE_FIELDS = [
  "site_name",
  "legal_name",
  "address",
  "city",
  "state",
  "country",
  "pi_name",
  "pi_license",
  "contact_name",
  "contact_email",
  "contact_phone",
  "ethics_committee",
  "ethics_registration",
  "therapeutic_areas",
  "facilities",
] as const;

export type SiteProfileField = (typeof SITE_PROFILE_FIELDS)[number];
export type SiteProfile = Record<SiteProfileField, string>;

export const SITE_PROFILE_COLUMNS = SITE_PROFILE_FIELDS.join(", ");
export const SITE_MIGRATION_HINT =
  "Falta aplicar supabase/migrations/20261021070000_site_profile.sql en Supabase.";

const text = (max: number) => z.string().trim().max(max);

export const siteProfileSchema = z.object({
  site_name: text(160),
  legal_name: text(200),
  address: text(300),
  city: text(100),
  state: text(100),
  country: text(100),
  pi_name: text(160),
  pi_license: text(60),
  contact_name: text(160),
  contact_email: z
    .string()
    .trim()
    .max(320)
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Correo de contacto inválido."),
  contact_phone: text(40),
  ethics_committee: text(200),
  ethics_registration: text(80),
  therapeutic_areas: text(400),
  facilities: text(1000),
});

export function emptySiteProfile(): SiteProfile {
  return Object.fromEntries(SITE_PROFILE_FIELDS.map((f) => [f, ""])) as SiteProfile;
}

export function siteProfileFromRow(
  row: Partial<Record<SiteProfileField, string | null>> | null | undefined
): SiteProfile {
  const profile = emptySiteProfile();
  if (!row) return profile;
  for (const field of SITE_PROFILE_FIELDS) {
    profile[field] = row[field]?.trim() ?? "";
  }
  return profile;
}

export function hasSiteIdentity(profile: SiteProfile | null | undefined): boolean {
  return Boolean(profile && (profile.site_name || profile.legal_name));
}

export function siteDisplayName(profile: SiteProfile | null | undefined): string {
  return profile?.site_name || profile?.legal_name || "";
}

export function siteLocation(profile: SiteProfile): string {
  return [profile.address, profile.city, profile.state, profile.country]
    .filter(Boolean)
    .join(", ");
}

/** Pares etiqueta/valor para el encabezado del informe; omite lo que está vacío. */
export function siteHeaderRows(profile: SiteProfile): { label: string; value: string }[] {
  const contact = [profile.contact_name, profile.contact_email, profile.contact_phone]
    .filter(Boolean)
    .join(" · ");
  const ethics = [profile.ethics_committee, profile.ethics_registration]
    .filter(Boolean)
    .join(" · ");
  const investigator = [profile.pi_name, profile.pi_license && `Cédula ${profile.pi_license}`]
    .filter(Boolean)
    .join(" · ");

  return [
    { label: "Razón social", value: profile.legal_name },
    { label: "Ubicación", value: siteLocation(profile) },
    { label: "Investigador principal", value: investigator },
    { label: "Contacto", value: contact },
    { label: "Comité de ética", value: ethics },
    { label: "Áreas terapéuticas", value: profile.therapeutic_areas },
    { label: "Infraestructura", value: profile.facilities },
  ].filter((row) => row.value);
}

export function siteFileSlug(profile: SiteProfile | null | undefined): string {
  const slug = siteDisplayName(profile)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug;
}
