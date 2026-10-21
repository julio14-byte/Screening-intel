import { normalizeTerm } from "@/lib/utils";

/**
 * Sinónimos deterministas EN/ES para exportaciones EDC (IQVIA, CDISC)
 * vs criterios del protocolo. No es IA: no cambia la regla, solo el texto.
 * No mapear "diabetes" suelto a tipo 2.
 */
const GROUPS: string[][] = [
  [
    "diabetes tipo 2",
    "diabetes mellitus tipo 2",
    "type 2 diabetes",
    "type 2 diabetes mellitus",
    "diabetes mellitus type 2",
    "t2dm",
    "dm2",
    "niddm",
  ],
  [
    "hipertension",
    "hipertension esencial",
    "hypertension",
    "essential hypertension",
    "hta",
    "htn",
    "high blood pressure",
  ],
  ["epoc", "copd", "chronic obstructive pulmonary disease", "epoc moderada"],
  ["insuficiencia renal", "renal failure", "chronic kidney disease", "ckd", "irc"],
  ["asma", "asthma"],
  ["metformina", "metformin"],
  ["enalapril", "enalapril maleate"],
  ["insulina", "insulin"],
  ["glucosa", "glucose", "gluc", "fasting glucose", "fpg"],
  ["hba1c", "a1c", "hemoglobin a1c", "hba1", "glycohemoglobin"],
  ["creatinina", "creatinine", "creat"],
  ["hemoglobina", "hemoglobin", "hgb", "hb"],
  ["pas", "sysbp", "sbp", "systolic"],
  ["pad", "diabp", "dbp", "diastolic"],
];

function aliasHit(term: string, alias: string): boolean {
  const t = normalizeTerm(term);
  const a = normalizeTerm(alias);
  if (!t || !a) return false;
  if (t === a) return true;
  if (a.length >= 8 && (t.includes(a) || a.includes(t))) return true;
  return false;
}

export function matchingTokens(term: string): string[] {
  const n = normalizeTerm(term);
  const tokens = new Set<string>([n]);
  for (const group of GROUPS) {
    if (group.some((alias) => aliasHit(term, alias))) {
      for (const alias of group) tokens.add(normalizeTerm(alias));
    }
  }
  return [...tokens];
}

function tokensOverlap(left: string, right: string): boolean {
  const have = matchingTokens(left);
  const need = matchingTokens(right);
  return have.some((a) => need.some((b) => a === b || a.includes(b) || b.includes(a)));
}

/** Términos del expediente que respaldan el criterio. Vacío si no hay coincidencia. */
export function findMatchingTerms(
  patientTerms: string[],
  criterion: string
): string[] {
  return patientTerms.filter((item) => tokensOverlap(item, criterion));
}

/** ¿El expediente cubre el criterio? Substring o sinónimo EN/ES. */
export function clinicalTermMatches(
  patientTerms: string[],
  criterion: string
): boolean {
  return findMatchingTerms(patientTerms, criterion).length > 0;
}

export function findLabEvidence(
  labs: Map<string, number>,
  criterionName: string
): { key: string; value: number } | undefined {
  for (const [key, value] of labs) {
    if (tokensOverlap(key, criterionName)) return { key, value };
  }
  return undefined;
}

export function labValueForCriterion(
  labs: Map<string, number>,
  criterionName: string
): number | undefined {
  return findLabEvidence(labs, criterionName)?.value;
}
