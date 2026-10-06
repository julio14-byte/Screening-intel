/**
 * Documentación pública del producto (landing + /docs).
 */
export const productDocs = {
  title: "Documentación",
  subtitle:
    "Versión 1: inteligencia de screening para clinical research sites. Cinco módulos.",
  sections: [
    {
      id: "inicio",
      title: "Inicio rápido",
      items: [
        {
          heading: "1. Patient Registry",
          body:
            "En /patients cargás a quienes YA están en tu site (alta, pegar Excel o CSV). Lo más rápido: copiá el listado DM+MH+CM+LB (USUBJID, BRTHDTC, SEX, MHTERM, CMTRT, LBTESTCD) y pegalo. No es un conector en vivo con Clinical Ink ni IQVIA.",
        },
        {
          heading: "2. Clinical Profile",
          body:
            "Abrí un paciente y completá historia, antecedentes, medicamentos y laboratorios. El coordinador llena; el matcher usa esos datos.",
        },
        {
          heading: "3. Protocol Matcher",
          body:
            "En /protocols definís inclusión y exclusión. El motor de reglas marca 🟢🟡🔴. La IA puede explicar el veredicto; no lo cambia.",
        },
        {
          heading: "4. Screening Tracker",
          body:
            "En /tracker el Kanban es Pre-screening → Screening → Randomizado → Screen failure. No es un sorteo. Randomizado lo marca el coordinador cuando el sponsor ya asignó kit.",
        },
        {
          heading: "5. Re-Match & Follow-up",
          body:
            "En /rematch un screen failure busca otros protocolos activos.",
        },
      ],
    },
  ],
};
