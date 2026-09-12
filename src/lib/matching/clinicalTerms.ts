import { normalizeTerm } from "@/lib/utils";

export type ClinicalTermKind = "condition" | "medication" | "lab";

type Concept = {
  id: string;
  /** Si está, un término genérico (el padre) también cubre este concepto. */
  parent?: string;
  aliases: string[];
};

const CONDITIONS: Concept[] = [
  {
    id: "diabetes",
    aliases: ["diabetes", "diabetes mellitus"],
  },
  {
    id: "diabetes_t2",
    parent: "diabetes",
    aliases: [
      "diabetes tipo 2",
      "diabetes mellitus tipo 2",
      "type 2 diabetes",
      "type 2 diabetes mellitus",
      "diabetes mellitus type 2",
      "t2dm",
      "dm2",
      "niddm",
    ],
  },
  {
    id: "diabetes_t1",
    parent: "diabetes",
    aliases: [
      "diabetes tipo 1",
      "diabetes mellitus tipo 1",
      "type 1 diabetes",
      "type 1 diabetes mellitus",
      "diabetes mellitus type 1",
      "t1dm",
      "dm1",
      "iddm",
    ],
  },
  {
    id: "hypertension",
    aliases: [
      "hipertension",
      "hipertension arterial",
      "hipertension esencial",
      "hta",
      "hypertension",
      "essential hypertension",
      "high blood pressure",
      "arterial hypertension",
    ],
  },
  {
    id: "ckd",
    aliases: [
      "insuficiencia renal",
      "insuficiencia renal cronica",
      "enfermedad renal cronica",
      "erc",
      "chronic kidney disease",
      "ckd",
      "chronic renal failure",
      "renal failure",
      "kidney failure",
    ],
  },
  {
    id: "copd",
    aliases: [
      "epoc",
      "enfermedad pulmonar obstructiva cronica",
      "copd",
      "chronic obstructive pulmonary disease",
      "chronic obstructive lung disease",
    ],
  },
  {
    id: "asthma",
    aliases: ["asma", "asthma", "bronchial asthma"],
  },
  {
    id: "obesity",
    aliases: ["obesidad", "obesity", "obese"],
  },
  {
    id: "pregnancy",
    aliases: [
      "embarazo",
      "gestacion",
      "gestante",
      "pregnancy",
      "pregnant",
      "gestation",
    ],
  },
  {
    id: "cancer",
    aliases: [
      "cancer",
      "neoplasia",
      "neoplasia maligna",
      "malignancy",
      "malignant neoplasm",
      "oncologic",
      "oncologico",
    ],
  },
  {
    id: "hiv",
    aliases: ["vih", "hiv", "hiv infection", "infeccion por vih"],
  },
  {
    id: "hepatitis",
    aliases: ["hepatitis", "hepatitis viral", "viral hepatitis"],
  },
  {
    id: "heart_failure",
    aliases: [
      "insuficiencia cardiaca",
      "icc",
      "heart failure",
      "congestive heart failure",
      "chf",
      "hfref",
    ],
  },
  {
    id: "stroke",
    aliases: [
      "acv",
      "accidente cerebrovascular",
      "ictus",
      "stroke",
      "cerebrovascular accident",
      "cva",
    ],
  },
  {
    id: "migraine",
    aliases: ["migrana", "migraine"],
  },
  {
    id: "dyslipidemia",
    aliases: [
      "dislipidemia",
      "hiperlipidemia",
      "dyslipidemia",
      "hyperlipidemia",
      "hypercholesterolemia",
      "hipercolesterolemia",
    ],
  },
  {
    id: "depression",
    aliases: ["depresion", "depression", "major depressive disorder", "mdd"],
  },
];

const MEDICATIONS: Concept[] = [
  {
    id: "insulin",
    aliases: ["insulina", "insulin", "insulin therapy"],
  },
  {
    id: "metformin",
    aliases: ["metformina", "metformin"],
  },
  {
    id: "glp1",
    aliases: [
      "agonista glp-1",
      "agonista glp1",
      "glp-1 agonist",
      "glp1 agonist",
      "semaglutida",
      "semaglutide",
      "liraglutida",
      "liraglutide",
      "dulaglutida",
      "dulaglutide",
    ],
  },
  {
    id: "sglt2",
    aliases: [
      "sglt2",
      "empagliflozina",
      "empagliflozin",
      "dapagliflozina",
      "dapagliflozin",
    ],
  },
  {
    id: "steroid",
    aliases: [
      "corticoide",
      "corticoides",
      "corticoesteroide",
      "corticosteroid",
      "corticosteroids",
      "steroids",
      "prednisona",
      "prednisone",
    ],
  },
  {
    id: "warfarin",
    aliases: ["warfarina", "warfarin", "coumadin"],
  },
  {
    id: "ibuprofen",
    aliases: ["ibuprofeno", "ibuprofen"],
  },
];

const LABS: Concept[] = [
  {
    id: "hba1c",
    aliases: [
      "hba1c",
      "hb a1c",
      "a1c",
      "hemoglobin a1c",
      "haemoglobin a1c",
      "hemoglobina glicosilada",
      "hemoglobina glucosilada",
      "glicohemoglobina",
    ],
  },
  {
    id: "glucose",
    aliases: [
      "glucosa",
      "glucose",
      "glucosa en ayunas",
      "fasting glucose",
      "fasting plasma glucose",
      "fpg",
    ],
  },
  {
    id: "creatinine",
    aliases: [
      "creatinina",
      "creatinine",
      "serum creatinine",
      "creatinina serica",
      "scr",
    ],
  },
  {
    id: "egfr",
    aliases: [
      "egfr",
      "tfg",
      "filtrado glomerular",
      "tasa de filtrado glomerular",
      "estimated glomerular filtration rate",
    ],
  },
  {
    id: "alt",
    aliases: ["alt", "gpt", "alanina aminotransferasa", "alanine aminotransferase"],
  },
  {
    id: "ast",
    aliases: ["ast", "got", "aspartato aminotransferasa", "aspartate aminotransferase"],
  },
  {
    id: "ldl",
    aliases: ["ldl", "colesterol ldl", "ldl cholesterol"],
  },
  {
    id: "triglycerides",
    aliases: ["trigliceridos", "triglycerides", "triglyceride"],
  },
  {
    id: "hemoglobin",
    aliases: ["hemoglobina", "hemoglobin", "haemoglobin", "hb"],
  },
  {
    id: "platelets",
    aliases: ["plaquetas", "platelets", "platelet count"],
  },
  {
    id: "bmi",
    aliases: ["imc", "bmi", "indice de masa corporal", "body mass index"],
  },
];

const CATALOGS: Record<ClinicalTermKind, Concept[]> = {
  condition: CONDITIONS,
  medication: MEDICATIONS,
  lab: LABS,
};

function containsPhrase(haystack: string, needle: string): boolean {
  if (!needle) return false;
  if (needle.length < 3) return haystack === needle;
  if (haystack === needle) return true;
  if (!haystack.includes(needle)) return false;
  return ` ${haystack} `.includes(` ${needle} `);
}

function catalogById(catalog: Concept[]): Map<string, Concept> {
  return new Map(catalog.map((c) => [c.id, c]));
}

function conceptIdsFor(term: string, catalog: Concept[]): Set<string> {
  const n = normalizeTerm(term);
  if (!n) return new Set();

  const scored: { id: string; len: number }[] = [];
  for (const concept of catalog) {
    let best = 0;
    for (const alias of concept.aliases) {
      const a = normalizeTerm(alias);
      if (!a) continue;
      if (n === a) best = Math.max(best, a.length + 8);
      else if (containsPhrase(n, a) || containsPhrase(a, n)) {
        best = Math.max(best, a.length);
      }
    }
    if (best > 0) scored.push({ id: concept.id, len: best });
  }

  if (scored.length === 0) return new Set();
  const max = Math.max(...scored.map((s) => s.len));
  return new Set(scored.filter((s) => s.len === max).map((s) => s.id));
}

function lineage(id: string, catalog: Concept[]): Set<string> {
  const byId = catalogById(catalog);
  const out = new Set<string>();
  let current: string | undefined = id;
  while (current && !out.has(current)) {
    out.add(current);
    current = byId.get(current)?.parent;
  }
  return out;
}

/**
 * Compara dos términos clínicos. Conserva el match por substring y suma
 * sinónimos ES/EN (hypertension ↔ hipertensión) sin cruzar hermanos
 * (diabetes tipo 1 ↛ tipo 2).
 */
export function clinicalTermsMatch(
  left: string,
  right: string,
  kind: ClinicalTermKind
): boolean {
  const a = normalizeTerm(left);
  const b = normalizeTerm(right);
  if (!a || !b) return false;
  if (a === b || containsPhrase(a, b) || containsPhrase(b, a)) return true;

  const catalog = CATALOGS[kind];
  const idsA = conceptIdsFor(left, catalog);
  const idsB = conceptIdsFor(right, catalog);
  if (idsA.size === 0 || idsB.size === 0) return false;

  for (const idA of idsA) {
    const lineA = lineage(idA, catalog);
    for (const idB of idsB) {
      const lineB = lineage(idB, catalog);
      if (lineA.has(idB) || lineB.has(idA)) return true;
    }
  }
  return false;
}

export function someTermMatches(
  haystack: string[],
  needle: string,
  kind: ClinicalTermKind
): boolean {
  return haystack.some((item) => clinicalTermsMatch(item, needle, kind));
}

/** Primer valor de laboratorio cuyo nombre es sinónimo del criterio. */
export function findLabValue(
  labs: Record<string, number>,
  name: string
): number | undefined {
  for (const [key, value] of Object.entries(labs)) {
    if (!clinicalTermsMatch(key, name, "lab")) continue;
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}
