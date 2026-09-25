/**
 * Versión 1: inteligencia de screening para clinical research sites.
 * EDC, ePRO e IWRS los opera un tercero (Integraciones).
 */
export const PRODUCT_MODULE_IDS = [
  "registry",
  "profile",
  "matcher",
  "tracker",
  "rematch",
  "integraciones",
] as const;
export type ProductModuleId = (typeof PRODUCT_MODULE_IDS)[number];

export const SCREENING_MODULE_IDS = [
  "registry",
  "profile",
  "matcher",
  "tracker",
  "rematch",
] as const;

export const PRODUCT_MODULES: Record<
  ProductModuleId,
  { id: ProductModuleId; label: string; href: string; summary: string }
> = {
  registry: {
    id: "registry",
    label: "1. Patient Registry",
    href: "/patients",
    summary:
      "Quienes YA están en tu site. Alta, CSV y búsqueda. Entrada al matching, no una base para vender.",
  },
  profile: {
    id: "profile",
    label: "2. Clinical Profile",
    href: "/patients",
    summary:
      "Historia, antecedentes, medicamentos y laboratorios. El coordinador lo llena; el matcher lo usa.",
  },
  matcher: {
    id: "matcher",
    label: "3. Protocol Matcher",
    href: "/protocols",
    summary:
      "Paciente ↔ protocolo. Reglas 🟢🟡🔴. La IA explica; no cambia la elegibilidad.",
  },
  tracker: {
    id: "tracker",
    label: "4. Screening Tracker",
    href: "/tracker",
    summary:
      "Pre-screening → Screening → Randomizado → Screen failure. No es un sorteo.",
  },
  rematch: {
    id: "rematch",
    label: "5. Re-Match & Follow-up",
    href: "/rematch",
    summary:
      "Un screen failure no es un paciente perdido: otros protocolos activos donde todavía califica.",
  },
  integraciones: {
    id: "integraciones",
    label: "Integraciones",
    href: "/integraciones",
    summary:
      "EDC, ePRO e IWRS de terceros por webhook HMAC. No es un conector Lilly ni Medidata.",
  },
};

export const PRODUCT_MODULE_NAV_LABEL: Record<string, string> = {
  screening: "Screening",
  integraciones: "Integraciones",
};
