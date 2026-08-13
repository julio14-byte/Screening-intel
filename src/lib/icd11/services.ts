import {
  formatIcd11Condition,
  formatIcd11SearchList,
  type Icd11SearchResult,
} from "@/lib/icd11/utils";
import { getIcd11Entity, searchIcd11 } from "@/lib/icd11/who-client";

export async function runIcd11Search(query: string) {
  const results = await searchIcd11(query);

  return {
    count: results.length,
    names: results.map((result) => formatIcd11Condition(result)),
    text: formatIcd11SearchList(results),
  };
}

export async function runIcd11GetEntity(idOrCode: string) {
  const entity = await getIcd11Entity(idOrCode);

  return {
    title: entity.title ?? "(sin título)",
    definition: entity.definition,
    inclusions: entity.inclusions,
    exclusions: entity.exclusions,
  };
}

function pickBestMatch(
  colloquial: string,
  results: Icd11SearchResult[]
): Icd11SearchResult | null {
  if (results.length === 0) return null;

  const sorted = [...results].sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0)
  );

  const colloquialNorm = colloquial.trim().toLowerCase();
  const exactTitle = sorted.find(
    (result) => formatIcd11Condition(result).toLowerCase() === colloquialNorm
  );
  if (exactTitle) return exactTitle;

  return sorted[0] ?? null;
}

/**
 * Convierte lenguaje coloquial o informal a la terminología oficial ICD-11.
 */
export async function runIcd11NormalizeColloquial(colloquial: string) {
  const term = colloquial.trim();
  if (!term) {
    return { error: "Indicá un término coloquial para normalizar." };
  }

  const results = await searchIcd11(term);
  const best = pickBestMatch(term, results);

  if (!best) {
    return {
      colloquial: term,
      normalized: null,
      alternatives: [],
      message: `No encontré equivalencia ICD-11 para "${term}".`,
    };
  }

  const normalized = formatIcd11Condition(best);
  const alternatives = results
    .filter((result) => result.id !== best.id)
    .slice(0, 4)
    .map((result) => formatIcd11Condition(result));

  return {
    colloquial: term,
    normalized,
    alternatives,
    summary: `"${term}" → ${normalized}`,
    detail: formatIcd11SearchList(results.slice(0, 5)),
  };
}
