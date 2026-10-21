/** Módulos de screening del producto. */
export const PRODUCT_MODULE_IDS = [
  "registry",
  "profile",
  "matcher",
  "tracker",
  "rematch",
] as const;
export type ProductModuleId = (typeof PRODUCT_MODULE_IDS)[number];

export const SCREENING_MODULE_IDS = PRODUCT_MODULE_IDS;

export const PRODUCT_MODULES: Record<
  ProductModuleId,
  { id: ProductModuleId; label: string; href: string; summary: string }
> = {
  registry: {
    id: "registry",
    label: "1. Patient Registry",
    href: "/patients",
    summary: "Registro de pacientes del centro.",
  },
  profile: {
    id: "profile",
    label: "2. Clinical Profile",
    href: "/patients",
    summary: "Perfil clínico.",
  },
  matcher: {
    id: "matcher",
    label: "3. Protocol Matcher",
    href: "/protocols",
    summary: "Criterios de inclusión y exclusión.",
  },
  tracker: {
    id: "tracker",
    label: "4. Screening Tracker",
    href: "/tracker",
    summary: "Pipeline de screening.",
  },
  rematch: {
    id: "rematch",
    label: "5. Re-Match & Follow-up",
    href: "/rematch",
    summary: "Screen failures en otros protocolos.",
  },
};

export const PRODUCT_MODULE_NAV_LABEL: Record<string, string> = {
  screening: "Screening",
  estudio: "Estudio en curso",
};
