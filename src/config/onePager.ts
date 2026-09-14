/**
 * Copy del one-pager de Crisvia (ES / EN).
 * Pensado para imprimir 1 hoja A4 o pegar en Notion / PDF.
 */
export type OnePagerLang = "es" | "en";

export type OnePagerCopy = {
  metaTitle: string;
  metaDescription: string;
  kicker: string;
  tagline: string;
  oneLiner: string;
  problemTitle: string;
  problemLead: string;
  problemItems: string[];
  productTitle: string;
  productLead: string;
  steps: { n: string; title: string; body: string }[];
  whyTitle: string;
  whyItems: { title: string; body: string }[];
  buyerTitle: string;
  buyerBody: string;
  modelTitle: string;
  modelLead: string;
  plans: { name: string; price: string; detail: string }[];
  statusTitle: string;
  statusItems: string[];
  askTitle: string;
  askBody: string;
  disclaimer: string;
  printLabel: string;
  langEs: string;
  langEn: string;
  backLabel: string;
  demoUrlLabel: string;
};

export const onePagerCopy: Record<OnePagerLang, OnePagerCopy> = {
  es: {
    metaTitle: "Crisvia — one-pager",
    metaDescription:
      "SaaS para clinical research sites: del candidato al protocolo correcto, y de vuelta al funnel cuando hay screen failure.",
    kicker: "HealthTech SaaS · Clinical research sites",
    tagline: "Clinical Research Sites",
    oneLiner:
      "Del candidato al protocolo correcto — y de vuelta al funnel cuando hay screen failure.",
    problemTitle: "El problema",
    problemLead:
      "El enrollment es el cuello de botella del ensayo. El coordinador no tiene un sistema operativo del site: tiene Excel, WhatsApp y el CTMS del sponsor.",
    problemItems: [
      "Los candidatos llegan por referidos, portal o el hospital y se pierden entre el pre-registro y la visita.",
      "El matching es manual, lento y no explicable criterio por criterio.",
      "Tras un screen failure el paciente sale del radar en vez de ir a otro protocolo activo del mismo centro.",
    ],
    productTitle: "El producto",
    productLead:
      "Crisvia es el funnel operativo del clinical research site. La IA explica y acelera; el motor de reglas decide la elegibilidad.",
    steps: [
      {
        n: "1",
        title: "Captura",
        body: "Portal público, CSV, nota clínica, PDF de laboratorio o foto de receta.",
      },
      {
        n: "2",
        title: "Match",
        body: "Motor de reglas con semáforo 🟢 cumple / 🟡 pendiente / 🔴 no cumple y justificación clínica.",
      },
      {
        n: "3",
        title: "Opera",
        body: "Triage IA para la llamada, WhatsApp/SMS con plantillas, agenda de visitas y consentimiento informado.",
      },
      {
        n: "4",
        title: "Recupera",
        body: "Screen failure → Re-Match nativo al siguiente protocolo activo del centro.",
      },
    ],
    whyTitle: "Por qué Crisvia",
    whyItems: [
      {
        title: "Hecho para el site",
        body: "El CTMS sirve al sponsor. Crisvia cubre el día a día del coordinador y del PI.",
      },
      {
        title: "Re-Match nativo",
        body: "El screen failure no es el final: el paciente vuelve a protocolos activos del mismo centro.",
      },
      {
        title: "IA que no decide",
        body: "Extrae, resume y explica. Nunca cambia inclusión / exclusión. Semáforo auditable.",
      },
      {
        title: "LATAM-first",
        body: "Español latinoamericano. Los labs entran por PDF o foto de receta, no por un conector hospitalario.",
      },
    ],
    buyerTitle: "Quién compra",
    buyerBody:
      "PI o dueño de site / red de sites en México, Colombia, Argentina, Chile y Perú. Quién usa: el coordinador. Wedge: un centro, un protocolo, una métrica.",
    modelTitle: "Modelo",
    modelLead: "SaaS B2B. Trial 14 días. Stripe. Precio en USD / mes.",
    plans: [
      { name: "Free", price: "$0", detail: "50 pacientes · 3 protocolos · 1 usuario" },
      { name: "Pro", price: "$399", detail: "500 pacientes · 50 protocolos · 3 usuarios" },
      { name: "Pro+", price: "$699", detail: "2.000 pacientes · 100 protocolos · 10 usuarios" },
    ],
    statusTitle: "Estado",
    statusItems: [
      "Producto desplegado: screening-intel.vercel.app",
      "MVP operativo: matching, portal, rematch, agenda, ICF, WhatsApp/SMS, RBAC, bitácora",
      "Sin tracción comercial publicada — buscando los primeros 3 sites piloto",
    ],
    askTitle: "El ask",
    askBody:
      "3 clinical research sites · piloto de 90 días · 1 protocolo real. Métrica: tiempo a pre-screening y % de screen failures reasignados a otro estudio.",
    disclaimer:
      "Controles alineados a HIPAA, GDPR, leyes de datos de LatAm y 21 CFR Part 11. Crisvia no emite la certificación de tu centro ni sustituye el BAA / DPA legal.",
    printLabel: "Imprimir / PDF",
    langEs: "ES",
    langEn: "EN",
    backLabel: "Volver al inicio",
    demoUrlLabel: "Demo",
  },
  en: {
    metaTitle: "Crisvia — one-pager",
    metaDescription:
      "SaaS for clinical research sites: from candidate to the right protocol — and back into the funnel after a screen failure.",
    kicker: "HealthTech SaaS · Clinical research sites",
    tagline: "Clinical Research Sites",
    oneLiner:
      "From candidate to the right protocol — and back into the funnel after a screen failure.",
    problemTitle: "The problem",
    problemLead:
      "Enrollment is the bottleneck. Coordinators don’t have a site operating system — they have Excel, WhatsApp, and the sponsor’s CTMS.",
    problemItems: [
      "Candidates arrive via referrals, a public form, or the hospital, then stall between pre-registration and the visit.",
      "Matching is manual, slow, and not explainable criterion by criterion.",
      "After a screen failure the patient drops off the radar instead of moving to another active protocol at the same site.",
    ],
    productTitle: "The product",
    productLead:
      "Crisvia is the operational funnel for the clinical research site. AI explains and speeds up work; a rules engine decides eligibility.",
    steps: [
      {
        n: "1",
        title: "Capture",
        body: "Public portal, CSV, clinical note, lab PDF or prescription photo.",
      },
      {
        n: "2",
        title: "Match",
        body: "Rules engine with a 🟢 pass / 🟡 pending / 🔴 fail traffic light and clinical rationale.",
      },
      {
        n: "3",
        title: "Run",
        body: "AI briefing for the call, WhatsApp/SMS templates, visit calendar, and informed consent.",
      },
      {
        n: "4",
        title: "Recover",
        body: "Screen failure → native Re-Match to the next active protocol at the site.",
      },
    ],
    whyTitle: "Why Crisvia",
    whyItems: [
      {
        title: "Built for the site",
        body: "CTMS serves the sponsor. Crisvia covers the coordinator and PI’s day-to-day.",
      },
      {
        title: "Native Re-Match",
        body: "Screen failure is not the end: the patient is proposed for other active protocols.",
      },
      {
        title: "AI that does not decide",
        body: "Extracts, summarizes, explains. Never changes inclusion / exclusion. Auditable lights.",
      },
      {
        title: "LATAM-first",
        body: "Latin American Spanish. Labs come in as PDF or prescription photo — not a hospital EHR connector.",
      },
    ],
    buyerTitle: "Who buys",
    buyerBody:
      "PI or site owner / site network in Mexico, Colombia, Argentina, Chile, and Peru. User: the study coordinator. Wedge: one site, one protocol, one metric.",
    modelTitle: "Model",
    modelLead: "B2B SaaS. 14-day trial. Stripe. USD / month.",
    plans: [
      { name: "Free", price: "$0", detail: "50 patients · 3 protocols · 1 user" },
      { name: "Pro", price: "$399", detail: "500 patients · 50 protocols · 3 users" },
      { name: "Pro+", price: "$699", detail: "2,000 patients · 100 protocols · 10 users" },
    ],
    statusTitle: "Status",
    statusItems: [
      "Product live: screening-intel.vercel.app",
      "Working MVP: matching, portal, rematch, calendar, ICF, WhatsApp/SMS, RBAC, audit trail",
      "No published commercial traction — looking for the first 3 pilot sites",
    ],
    askTitle: "The ask",
    askBody:
      "3 clinical research sites · 90-day pilot · 1 live protocol. Metric: time-to-prescreen and % of screen failures reassigned to another study.",
    disclaimer:
      "Controls aligned with HIPAA, GDPR, LatAm data laws, and 21 CFR Part 11. Crisvia does not certify your site and does not replace a BAA / DPA.",
    printLabel: "Print / PDF",
    langEs: "ES",
    langEn: "EN",
    backLabel: "Back to home",
    demoUrlLabel: "Demo",
  },
};

export function parseOnePagerLang(
  value: string | string[] | undefined
): OnePagerLang {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "en" ? "en" : "es";
}
