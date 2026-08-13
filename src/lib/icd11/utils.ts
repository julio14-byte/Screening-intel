export interface Icd11SearchResult {
  id: string;
  code?: string;
  title: string;
  matchingText?: string;
  score?: number;
}

/** Etiqueta visible: solo el nombre clínico, sin código ICD-11. */
export function formatIcd11Condition(result: Icd11SearchResult): string {
  return result.title.trim() || "(sin título)";
}

/** Quita prefijos tipo "5A11 — " de condiciones guardadas antes. */
export function normalizeConditionLabel(line: string): string {
  const withoutCode = line
    .replace(/^[A-Z0-9][A-Z0-9.]*\s*[—–-]\s*/u, "")
    .trim();
  return withoutCode || line.trim();
}

/** Convierte texto libre (líneas o comas) a lista para la base de datos. */
export function parseConditionsText(text: string): string[] {
  return text
    .split(/\n|,/)
    .map((line) => normalizeConditionLabel(line))
    .filter(Boolean);
}

/** Convierte la lista guardada a texto libre multilínea. */
export function conditionsToText(conditions: string[]): string {
  return conditions.map(normalizeConditionLabel).join("\n");
}

/** Lista legible para MCP / chat (solo nombres). */
export function formatIcd11SearchList(results: Icd11SearchResult[]): string {
  if (results.length === 0) return "Sin resultados.";
  return results.map((result) => `• ${formatIcd11Condition(result)}`).join("\n");
}
