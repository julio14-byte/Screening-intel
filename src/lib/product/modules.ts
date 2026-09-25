/** Screening en la app. EDC, ePRO e IWRS los opera un tercero conectado por webhook. */

export const PRODUCT_MODULE_IDS = ["screening", "integraciones"] as const;
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
  integraciones: {
    id: "integraciones",
    label: "Integraciones",
    href: "/integraciones",
    summary:
      "EDC, ePRO e IWRS de terceros por webhook HMAC. No es un conector Lilly ni Medidata.",
  },
};

export const PRODUCT_MODULE_NAV_LABEL: Record<ProductModuleId, string> = {
  screening: "Screening",
  integraciones: "Integraciones",
};
