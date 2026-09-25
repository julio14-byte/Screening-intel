/** Los tres módulos de la app + IWRS como servicio aparte (solo API). */

export const PRODUCT_MODULE_IDS = ["screening", "edc", "epro", "iwrs"] as const;
export type ProductModuleId = (typeof PRODUCT_MODULE_IDS)[number];

export const PRODUCT_MODULES: Record<
  ProductModuleId,
  { id: ProductModuleId; label: string; href: string; summary: string }
> = {
  screening: {
    id: "screening",
    label: "Screening",
    href: "/tracker",
    summary:
      "Elegibilidad: candidatos, matcher 🟢🟡🔴, tracker y re-match. No sortea kit.",
  },
  edc: {
    id: "edc",
    label: "EDC",
    href: "/edc",
    summary:
      "Captura clínica del centro: expediente, visitas, inventario y dispensación. No es un EDC CDISC certificado.",
  },
  epro: {
    id: "epro",
    label: "ePRO",
    href: "/epro",
    summary:
      "Cuestionarios del paciente (síntomas, calidad de vida). Distinto del diario de toma.",
  },
  iwrs: {
    id: "iwrs",
    label: "IWRS",
    href: "/iwrs",
    summary:
      "Módulo independiente: kit y brazo vía /api/iwrs. Screening y EDC lo llaman; no vive dentro del matcher.",
  },
};

export const PRODUCT_MODULE_NAV_LABEL: Record<ProductModuleId, string> = {
  screening: "Screening",
  edc: "EDC",
  epro: "ePRO",
  iwrs: "IWRS (API)",
};
